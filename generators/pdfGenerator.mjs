import PDFDocument from 'pdfkit';
import { minimalistTemplate } from './templates/minimalistTemplate.mjs';
import { zenTemplate } from './templates/zenTemplate.mjs';

/**
 * Get the selected template based on templateId parameter or environment variable
 * @param {string} templateId - Template ID from config
 * @returns {Object} Template module
 */
function getTemplate(templateId) {
    const templateName = templateId || process.env.INVOICE_TEMPLATE || 'minimalist';
    
    switch (templateName.toLowerCase()) {
        case 'zen':
            return zenTemplate;
        case 'minimalist':
        default:
            return minimalistTemplate;
    }
}

/**
 * Generates a PDF invoice from invoice data
 * @param {Object} data - Invoice data containing order, customer, line items, and totals
 * @param {Object} templateConfig - Template configuration (from DB or env)
 * @returns {Promise<Buffer>} PDF buffer
 */
export async function generateInvoicePDF(data, templateConfig = null) {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({ 
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });
        
        const chunks = [];
        
        // Collect PDF data
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        
        try {
            // Get selected template based on config
            const template = getTemplate(templateConfig?.template);
            
            console.log(`📄 Generating invoice with template: ${templateConfig?.template || 'minimalist'}`);
            console.log(`📊 Invoice data keys: ${Object.keys(data).join(', ')}`);
            console.log(`📊 Order keys: ${data.order ? Object.keys(data.order).join(', ') : 'N/A'}`);
            console.log(`📊 Customer keys: ${data.customer ? Object.keys(data.customer).join(', ') : 'N/A'}`);
            console.log(`📊 Customer name: ${data.customer?.name}`);
            console.log(`📊 ShippingAddress keys: ${data.shippingAddress ? Object.keys(data.shippingAddress).join(', ') : 'N/A'}`);
            console.log(`📊 LineItems count: ${data.lineItems?.length}, first item keys: ${data.lineItems?.[0] ? Object.keys(data.lineItems[0]).join(', ') : 'N/A'}`);
            console.log(`📊 Totals keys: ${data.totals ? Object.keys(data.totals).join(', ') : 'N/A'}`);
            
            // Use provided config or fallback to env variable
            const colorScheme = templateConfig ? 
                template.getColorScheme(templateConfig.colors.primary, templateConfig.colors) :
                template.getColorScheme(process.env.INVOICE_PRIMARY_COLOR || '#333333');
            
            // Render invoice using template with color scheme and config (now async)
            let yPos = await template.renderHeader(doc, data, colorScheme, templateConfig);
            yPos = template.renderOrderInfo(doc, data, yPos, colorScheme, templateConfig);
            yPos = template.renderLineItems(doc, data, yPos, colorScheme, templateConfig);
            yPos = template.renderTotals(doc, data, yPos, colorScheme, templateConfig);
            yPos = await template.renderSignature(doc, data, yPos, colorScheme, templateConfig);
            yPos = template.renderFooter(doc, data, yPos, colorScheme, templateConfig);
            
            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Generates a PDF credit note using the same template selected by the shop,
 * mapping credit note data into the invoice data structure.
 */
export async function generateCreditNotePDF(data, templateConfig = null) {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        try {
            const template = getTemplate(templateConfig?.template);
            const colorScheme = templateConfig
                ? template.getColorScheme(templateConfig.colors?.primary, templateConfig.colors)
                : template.getColorScheme();

            const REASON_LABELS = {
                cancellation: 'Order Cancellation',
                full_refund: 'Full Refund',
                partial_refund: 'Partial Refund',
                exchange: 'Exchange / Return',
            };

            const fmt = (n) => `Rs. ${(Number(n) || 0).toFixed(2)}`;
            const fmtDate = (iso) => {
                if (!iso) return '';
                return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            };

            const cn = data.creditNote;
            const totals = data.totals;
            const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
            const bodySize = templateConfig?.fonts?.bodySize || 11;
            const headingSize = templateConfig?.fonts?.headingSize || 16;
            const bodyLineHeight = bodySize * 1.5;
            const headingLineHeight = headingSize * 1.4;
            const labelGap = 10;

            // Map credit note line items → invoice line item format expected by templates
            const mappedLineItems = (data.lineItems || []).map(item => ({
                name: item.productTitle || '',
                description: item.sku ? `SKU: ${item.sku}` : (item.hsn ? `HSN: ${item.hsn}` : ''),
                quantity: item.quantity,
                mrp: fmt(item.unitPrice),
                discount: fmt(item.discount),
                sellingPrice: fmt(item.taxableValue),
                _cgst: Number(item.cgst) || 0,
                _sgst: Number(item.sgst) || 0,
                _igst: Number(item.igst) || 0,
                sellingPriceAfterTax: fmt((Number(item.taxableValue) || 0) + (Number(item.totalTax) || 0)),
                tax: fmt(item.totalTax),
            }));

            // Build invoice-shaped data object reused by template render functions
            const invoiceData = {
                order: { name: cn.id, date: fmtDate(cn.date) },
                customer: { name: data.customer?.name || '', email: data.customer?.email || '' },
                shippingAddress: { address: '', city: '', state: '', zip: '' },
                company: data.company || {},
                lineItems: mappedLineItems,
                totals: {
                    subtotal: fmt(totals.taxableValue),
                    cgst: totals.cgst > 0 ? fmt(totals.cgst) : null,
                    sgst: totals.sgst > 0 ? fmt(totals.sgst) : null,
                    igst: totals.igst > 0 ? fmt(totals.igst) : null,
                    tax: fmt(totals.totalTax),
                    discount: null,
                    shipping: 'Rs. 0.00',
                    total: fmt(totals.totalCredit),
                },
            };

            // 1. Company header — identical to invoice
            let yPos = await template.renderHeader(doc, invoiceData, colorScheme, templateConfig);

            // 2. CREDIT NOTE banner — light grey background, black bold text
            doc.rect(50, yPos, 495, 32).fill('#f3f4f6');
            doc.font(`${fontFamily}-Bold`)
               .fontSize(14)
               .fillColor('#111827')
               .text('CREDIT NOTE', 50, yPos + 9, { width: 495, align: 'center' });
            yPos += 42;

            // 3. Credit note details section (replaces renderOrderInfo)
            doc.font(fontFamily).fontSize(headingSize).fillColor(colorScheme.accent)
               .text('Credit Note Details', 50, yPos);
            doc.fontSize(headingSize).fillColor(colorScheme.accent)
               .text('Customer', 300, yPos, { width: 245, align: 'right' });
            yPos += headingLineHeight + 8;

            doc.fontSize(bodySize).fillColor('#6b7280').text('Credit Note #:', 50, yPos);
            doc.fillColor('#111827').text(cn.id, 50 + doc.widthOfString('Credit Note #:') + labelGap, yPos);
            doc.fillColor('#111827').text(data.customer?.name || '', 300, yPos, { width: 245, align: 'right' });
            yPos += bodyLineHeight + 4;

            doc.fontSize(bodySize).fillColor('#6b7280').text('Date:', 50, yPos);
            doc.fillColor('#111827').text(fmtDate(cn.date), 50 + doc.widthOfString('Date:') + labelGap, yPos);
            if (data.customer?.email) {
                doc.fillColor('#6b7280').text(data.customer.email, 300, yPos, { width: 245, align: 'right' });
            }
            yPos += bodyLineHeight + 4;

            doc.fontSize(bodySize).fillColor('#6b7280').text('Original Order:', 50, yPos);
            doc.fillColor('#111827').text(cn.originalOrderName || '', 50 + doc.widthOfString('Original Order:') + labelGap, yPos);
            yPos += bodyLineHeight + 4;

            if (cn.originalInvoiceDate) {
                doc.fontSize(bodySize).fillColor('#6b7280').text('Invoice Date:', 50, yPos);
                doc.fillColor('#111827').text(fmtDate(cn.originalInvoiceDate), 50 + doc.widthOfString('Invoice Date:') + labelGap, yPos);
                yPos += bodyLineHeight + 4;
            }

            doc.fontSize(bodySize).fillColor('#6b7280').text('Reason:', 50, yPos);
            doc.fillColor('#111827').text(REASON_LABELS[cn.type] || cn.type, 50 + doc.widthOfString('Reason:') + labelGap, yPos);
            yPos += bodyLineHeight + 8;

            doc.moveTo(50, yPos).lineTo(545, yPos).strokeColor(colorScheme.border).stroke();
            yPos += 15;

            // 4. Line items, totals, signature, footer — reuse template unchanged
            yPos = template.renderLineItems(doc, invoiceData, yPos, colorScheme, templateConfig);
            yPos = template.renderTotals(doc, invoiceData, yPos, colorScheme, templateConfig);
            yPos = await template.renderSignature(doc, invoiceData, yPos, colorScheme, templateConfig);
            yPos = template.renderFooter(doc, invoiceData, yPos, colorScheme, templateConfig);

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}
