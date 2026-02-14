import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { downloadImageFromS3 } from '../../services/s3Service.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Zen Configurable Invoice Template
 * Colorful, modern design with vibrant accents, gradients, and GST compliance
 */

/**
 * Get color scheme based on primary color
 * @param {string} primaryColor - Hex color code (default: #6366f1 for vibrant indigo)
 * @param {Object} colors - Full colors config from DB (optional)
 * @returns {Object} Color scheme object
 */
function getColorScheme(primaryColor = '#6366f1', colors = null) {
    // If colors object provided from config, use it
    if (colors) {
        return {
            primary: colors.primary || '#6366f1',
            secondary: colors.secondary || '#8b5cf6',
            accent: colors.accent || '#ec4899',
            border: colors.border || '#e0e7ff',
            background: colors.background || '#faf5ff',
            success: colors.success || '#10b981',
            warning: colors.warning || '#f59e0b',
            error: colors.error || '#ef4444'
        };
    }
    
    // Default colorful Zen scheme with vibrant gradients
    return {
        primary: primaryColor || '#6366f1',      // Indigo
        secondary: '#8b5cf6',                     // Purple
        accent: '#ec4899',                        // Pink
        border: '#e0e7ff',                        // Light indigo
        background: '#faf5ff',                    // Very light purple
        success: '#10b981',                       // Green
        warning: '#f59e0b',                       // Amber
        error: '#ef4444'                          // Red
    };
}

export const zenTemplate = {
    name: 'Zen (Colorful)',
    
    /**
     * Render company header with logo and colorful gradient banner
     */
    async renderHeader(doc, data, colorScheme, templateConfig = null) {
        const companyName = templateConfig?.company?.name || 'Your Company Name';
        const companyLegalName = templateConfig?.company?.legalName || 'Legal Entity Name';
        const companyAddress1 = templateConfig?.company?.address?.line1 || 'Address Line 1';
        const companyAddress2 = templateConfig?.company?.address?.line2 || 'Address Line 2';
        const companyCity = templateConfig?.company?.address?.city || '';
        const companyState = templateConfig?.company?.address?.state || '';
        const companyPincode = templateConfig?.company?.address?.pincode || '';
        const companyGSTIN = templateConfig?.company?.gstin || 'GSTIN Number';
        const companyLogo = templateConfig?.company?.logo || 'logo.JPG';
        
        // Font configuration
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const titleSize = templateConfig?.fonts?.titleSize || 32;
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        
        // Calculate dynamic spacing
        const titleLineHeight = titleSize * 1.2;
        const bodyLineHeight = bodySize * 1.35;
        
        // Get document header color from config or default to primary
        const documentHeaderBgColor = templateConfig?.styling?.documentHeaderBgColor || colorScheme.primary;
        
        // Draw colorful gradient header bar (increased height to accommodate all address lines)
        const gradientHeight = 140;
        doc.rect(0, 0, 595, gradientHeight)
           .fill(documentHeaderBgColor);
        
        // Add decorative accent bar at bottom of gradient
        doc.rect(0, gradientHeight - 4, 595, 4)
           .fill(colorScheme.accent);
        
        let yPos = 30;
        
        // Company name in white on gradient
        doc.font(fontFamily + '-Bold')
           .fontSize(titleSize)
           .fillColor('#ffffff')
           .text(companyName, 50, yPos);
        
        yPos += titleLineHeight - 5;
        
        doc.font(fontFamily)
           .fontSize(bodySize)
           .fillColor('rgba(255, 255, 255, 0.95)')
           .text(companyLegalName, 50, yPos);
        
        yPos += bodyLineHeight - 1;
        doc.text(companyAddress1, 50, yPos);
        
        yPos += bodyLineHeight - 1;
        doc.text(companyAddress2, 50, yPos);
        
        yPos += bodyLineHeight - 1;
        const cityStateZip = `${companyCity}${companyState ? ', ' + companyState : ''}${companyPincode ? ' - ' + companyPincode : ''}`.trim();
        if (cityStateZip && cityStateZip !== '-') {
            doc.text(cityStateZip, 50, yPos);
            yPos += bodyLineHeight - 1;
        }
        
        // Add GSTIN on the header
        if (companyGSTIN) {
            doc.font(fontFamily)
               .fontSize(bodySize - 1)
               .fillColor('rgba(255, 255, 255, 0.9)')
               .text(`GSTIN: ${companyGSTIN}`, 50, yPos);
        }
        
        // Logo on the right side
        try {
            const logoBuffer = await downloadImageFromS3(companyLogo);
            if (logoBuffer) {
                doc.image(logoBuffer, 445, 30, { 
                    fit: [100, 80], 
                    align: 'right'
                });
            }
        } catch (error) {
            console.error('Error loading logo:', error);
        }
        
        // Return position after gradient header
        return gradientHeight + 20;
    },
    
    /**
     * Render invoice information with colorful badges
     */
    renderOrderInfo(doc, data, yPos, colorScheme, templateConfig = null) {
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const headingSize = templateConfig?.fonts?.headingSize || 18;
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        const bodyLineHeight = bodySize * 1.35;
        
        // "INVOICE" heading with colorful badge
        const invoiceBoxWidth = 120;
        const invoiceBoxHeight = 35;
        doc.roundedRect(50, yPos, invoiceBoxWidth, invoiceBoxHeight, 8)
           .fill(colorScheme.accent);
        
        doc.font(fontFamily + '-Bold')
           .fontSize(20)
           .fillColor('#ffffff')
           .text('INVOICE', 50, yPos + 9, { width: invoiceBoxWidth, align: 'center' });
        
        // Invoice number and date in colored boxes
        yPos += invoiceBoxHeight + 15;
        
        // Left column - Invoice details
        doc.font(fontFamily + '-Bold')
           .fontSize(bodySize)
           .fillColor(colorScheme.primary)
           .text('Invoice Number:', 50, yPos);
        
        yPos += bodyLineHeight;
        doc.font(fontFamily)
           .fontSize(bodySize)
           .fillColor('#111827')
           .text(data.order.name || 'N/A', 50, yPos);
        
        yPos += bodyLineHeight + 8;
        doc.font(fontFamily + '-Bold')
           .fontSize(bodySize)
           .fillColor(colorScheme.primary)
           .text('Invoice Date:', 50, yPos);
        
        yPos += bodyLineHeight;
        doc.font(fontFamily)
           .fontSize(bodySize)
           .fillColor('#111827')
           .text(data.order.date || 'N/A', 50, yPos);
        
        yPos += bodyLineHeight + 8;
        doc.font(fontFamily + '-Bold')
           .fontSize(bodySize)
           .fillColor(colorScheme.primary)
           .text('Order Number:', 50, yPos);
        
        yPos += bodyLineHeight;
        doc.font(fontFamily)
           .fontSize(bodySize)
           .fillColor('#111827')
           .text(data.order.name || 'N/A', 50, yPos);
        
        // Right column - Customer details with colored box
        const customerBoxY = yPos - (bodyLineHeight * 6) - 8;
        const customerBoxX = 300;
        const customerBoxWidth = 245;
        const customerBoxPadding = 10;
        const customerTextWidth = customerBoxWidth - (customerBoxPadding * 2);
        
        let customerYPos = customerBoxY + 12;
        
        doc.font(fontFamily + '-Bold')
           .fontSize(bodySize + 1)
           .fillColor(colorScheme.secondary)
           .text('Bill To:', customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
        
        customerYPos += bodyLineHeight + 4;
        doc.font(fontFamily + '-Bold')
           .fontSize(bodySize)
           .fillColor('#111827')
           .text(data.customer.name || 'N/A', customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
        
        customerYPos += bodyLineHeight;
        
        // Format billing/shipping address (using transformer's pre-formatted structure)
        const addressText = data.shippingAddress.address;
        const cityStateZip = [data.shippingAddress.city, data.shippingAddress.state, data.shippingAddress.zip].filter(Boolean).join(', ');
        
        doc.font(fontFamily)
           .fontSize(bodySize - 1)
           .fillColor('#374151');
        
        if (addressText) {
            doc.text(addressText, customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
            customerYPos += doc.heightOfString(addressText, { width: customerTextWidth }) + 3;
        }
        
        if (cityStateZip) {
            doc.text(cityStateZip, customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
            customerYPos += doc.heightOfString(cityStateZip, { width: customerTextWidth }) + 3;
        }
        
        if (data.customer.phone) {
            doc.text(`Phone: ${data.customer.phone}`, customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
            customerYPos += bodyLineHeight;
        }
        
        // Calculate actual box height based on content
        const customerBoxHeight = Math.max(90, customerYPos - customerBoxY + 12);
        
        // Draw the box after we know the height
        doc.roundedRect(customerBoxX, customerBoxY, customerBoxWidth, customerBoxHeight, 6)
           .fillAndStroke(colorScheme.background, colorScheme.border);
        
        // Redraw all text on top of the box
        customerYPos = customerBoxY + 12;
        
        doc.font(fontFamily + '-Bold')
           .fontSize(bodySize + 1)
           .fillColor(colorScheme.secondary)
           .text('Bill To:', customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
        
        customerYPos += bodyLineHeight + 4;
        doc.font(fontFamily + '-Bold')
           .fontSize(bodySize)
           .fillColor('#111827')
           .text(data.customer.name || 'N/A', customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
        
        customerYPos += bodyLineHeight;
        
        doc.font(fontFamily)
           .fontSize(bodySize - 1)
           .fillColor('#374151');
        
        if (addressText) {
            doc.text(addressText, customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
            customerYPos += doc.heightOfString(addressText, { width: customerTextWidth }) + 3;
        }
        
        if (cityStateZip) {
            doc.text(cityStateZip, customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
            customerYPos += doc.heightOfString(cityStateZip, { width: customerTextWidth }) + 3;
        }
        
        if (data.customer.phone) {
            doc.text(`Phone: ${data.customer.phone}`, customerBoxX + customerBoxPadding, customerYPos, { width: customerTextWidth });
            customerYPos += bodyLineHeight;
        }
        
        return Math.max(yPos + bodyLineHeight + 4, customerYPos + 15);
    },
    
    /**
     * Render line items table with colorful header
     */
    renderLineItems(doc, data, yPos, colorScheme, templateConfig = null) {
        yPos += 20;
        
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const headingSize = templateConfig?.fonts?.headingSize || 18;
        const tableSize = templateConfig?.fonts?.tableSize || 8;
        
        // Section heading with decorative line
        doc.font(fontFamily + '-Bold')
           .fontSize(headingSize)
           .fillColor(colorScheme.primary)
           .text('Order Items', 50, yPos);
        
        doc.moveTo(50, yPos + 25)
           .lineTo(545, yPos + 25)
           .strokeColor(colorScheme.accent)
           .lineWidth(2)
           .stroke();
        
        yPos += 40;
        
        // Get header colors from config or defaults
        const tableHeaderBgColor = templateConfig?.styling?.tableHeaderBgColor || colorScheme.primary;
        const headerTextColor = templateConfig?.styling?.headerTextColor || '#ffffff';
        
        // Colorful table header with rounded corners
        doc.roundedRect(50, yPos, 495, 35, 4)
           .fill(tableHeaderBgColor);
        
        // Table headers - conditionally show CGST/SGST or IGST
        const showCGSTSGST = data.totals.cgst && data.totals.sgst;
        const showIGST = data.totals.igst;
        
        if (showCGSTSGST) {
            doc.fontSize(tableSize)
               .fillColor(headerTextColor)
               .text('Item', 55, yPos + 12, { width: 90 })
               .text('Qty', 150, yPos + 12, { width: 20, align: 'center' })
               .text('MRP', 175, yPos + 12, { width: 48, align: 'right' })
               .text('Discount', 228, yPos + 12, { width: 40, align: 'right' })
               .text('Price\nbefore tax', 273, yPos + 8, { width: 50, align: 'right' })
               .text('CGST', 328, yPos + 12, { width: 40, align: 'right' })
               .text('SGST', 373, yPos + 12, { width: 40, align: 'right' })
               .text('Price after tax', 400, yPos + 8, { width: 105, align: 'right' });
        } else if (showIGST) {
            doc.fontSize(tableSize)
               .fillColor(headerTextColor)
               .text('Item', 55, yPos + 12, { width: 105 })
               .text('Qty', 165, yPos + 12, { width: 20, align: 'center' })
               .text('MRP', 190, yPos + 12, { width: 50, align: 'right' })
               .text('Discount', 245, yPos + 12, { width: 45, align: 'right' })
               .text('Price\nbefore tax', 295, yPos + 8, { width: 55, align: 'right' })
               .text('IGST', 355, yPos + 12, { width: 50, align: 'right' })
               .text('Price after tax', 400, yPos + 8, { width: 105, align: 'right' });
        } else {
            doc.fontSize(tableSize)
               .fillColor(headerTextColor)
               .text('Item', 55, yPos + 12, { width: 110 })
               .text('Qty', 170, yPos + 12, { width: 25, align: 'center' })
               .text('MRP', 200, yPos + 12, { width: 55, align: 'right' })
               .text('Discount', 260, yPos + 12, { width: 55, align: 'right' })
               .text('Selling price\nbefore tax', 320, yPos + 8, { width: 60, align: 'right' })
               .text('Tax', 385, yPos + 12, { width: 45, align: 'right' })
               .text('Selling price\nafter tax', 405, yPos + 8, { width: 100, align: 'right' });
        }
        
        yPos += 35;
        
        // Table rows with alternating colors
        data.lineItems.forEach((item, index) => {
            const itemDisplayName = item.description 
                ? `${item.name} (${item.description.replace('Variant: ', '')})`
                : item.name;
            
            const rowHeight = 40;
            
            // Alternating row colors with subtle tint
            if (index % 2 === 0) {
                doc.rect(50, yPos, 495, rowHeight)
                   .fill(colorScheme.background);
            }
            
            // Add a new page if needed
            if (yPos > 700) {
                doc.addPage();
                yPos = 50;
            }
            
            const formatTaxAmount = (amount) => {
                const num = parseFloat(amount);
                return isNaN(num) ? '0.00' : num.toFixed(2);
            };
            
            const textColor = '#111827';
            const discountColor = colorScheme.error;
            
            if (showCGSTSGST) {
                // Tax amounts are numeric, prices are already formatted strings
                const cgstAmount = `₹${formatTaxAmount(item._cgst || 0)}`;
                const sgstAmount = `₹${formatTaxAmount(item._sgst || 0)}`;
                
                doc.fontSize(tableSize - 0.5)
                   .fillColor(textColor)
                   .text(itemDisplayName, 55, yPos + 15, { width: 90, lineBreak: true, height: rowHeight - 10 })
                   .text(item.quantity.toString(), 150, yPos + 15, { width: 20, align: 'center' })
                   .text(item.mrp, 175, yPos + 15, { width: 48, align: 'right' })
                   .fillColor(discountColor)
                   .text(item.discount, 228, yPos + 15, { width: 40, align: 'right' })
                   .fillColor(textColor)
                   .text(item.sellingPrice, 273, yPos + 15, { width: 50, align: 'right' })
                   .text(cgstAmount, 328, yPos + 15, { width: 40, align: 'right' })
                   .text(sgstAmount, 373, yPos + 15, { width: 40, align: 'right' })
                   .fillColor(colorScheme.success)
                   .text(item.sellingPriceAfterTax, 418, yPos + 15, { width: 87, align: 'right' });
            } else if (showIGST) {
                // Tax amounts are numeric, prices are already formatted strings
                const igstAmount = `₹${formatTaxAmount(item._igst || 0)}`;
                
                doc.fontSize(tableSize - 0.5)
                   .fillColor(textColor)
                   .text(itemDisplayName, 55, yPos + 15, { width: 105, lineBreak: true, height: rowHeight - 10 })
                   .text(item.quantity.toString(), 165, yPos + 15, { width: 20, align: 'center' })
                   .text(item.mrp, 190, yPos + 15, { width: 50, align: 'right' })
                   .fillColor(discountColor)
                   .text(item.discount, 245, yPos + 15, { width: 45, align: 'right' })
                   .fillColor(textColor)
                   .text(item.sellingPrice, 295, yPos + 15, { width: 55, align: 'right' })
                   .text(igstAmount, 355, yPos + 15, { width: 50, align: 'right' })
                   .fillColor(colorScheme.success)
                   .text(item.sellingPriceAfterTax, 408, yPos + 15, { width: 97, align: 'right' });
            } else {
                // All prices are already formatted strings
                doc.fontSize(tableSize - 0.5)
                   .fillColor(textColor)
                   .text(itemDisplayName, 55, yPos + 15, { width: 110, lineBreak: true, height: rowHeight - 10 })
                   .text(item.quantity.toString(), 170, yPos + 15, { width: 25, align: 'center' })
                   .text(item.mrp, 200, yPos + 15, { width: 55, align: 'right' })
                   .fillColor(discountColor)
                   .text(item.discount, 260, yPos + 15, { width: 55, align: 'right' })
                   .fillColor(textColor)
                   .text(item.sellingPrice, 320, yPos + 15, { width: 60, align: 'right' })
                   .text(item.tax, 385, yPos + 15, { width: 45, align: 'right' })
                   .fillColor(colorScheme.success)
                   .text(item.sellingPriceAfterTax, 405, yPos + 15, { width: 100, align: 'right' });
            }
            
            yPos += rowHeight;
            
            // Separator line
            doc.moveTo(50, yPos)
               .lineTo(545, yPos)
               .strokeColor(colorScheme.border)
               .lineWidth(0.5)
               .stroke();
        });
        
        return yPos;
    },
    
    /**
     * Render totals section with colorful summary boxes
     */
    renderTotals(doc, data, yPos, colorScheme, templateConfig = null) {
        yPos += 20;
        
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        const bodyLineHeight = bodySize * 1.5;
        
        // Summary box with gradient background
        const summaryBoxY = yPos;
        const summaryBoxHeight = 150;
        
        doc.roundedRect(340, summaryBoxY, 205, summaryBoxHeight, 8)
           .fill(colorScheme.background);
        
        doc.roundedRect(340, summaryBoxY, 205, summaryBoxHeight, 8)
           .strokeColor(colorScheme.primary)
           .lineWidth(1.5)
           .stroke();
        
        yPos = summaryBoxY + 15;
        
        const leftX = 350;
        const rightX = 535;
        
        // Subtotal (already formatted string)
        doc.font(fontFamily)
           .fontSize(bodySize)
           .fillColor('#374151')
           .text('Subtotal:', leftX, yPos)
           .text(data.totals.subtotal, leftX, yPos, { width: rightX - leftX, align: 'right' });
        
        yPos += bodyLineHeight + 2;
        
        // Discount (already formatted string)
        if (data.totals.discount) {
            doc.fillColor(colorScheme.error)
               .text('Discount:', leftX, yPos)
               .text(data.totals.discount, leftX, yPos, { width: rightX - leftX, align: 'right' });
            yPos += bodyLineHeight + 2;
        }
        
        // Shipping (already formatted string)
        if (data.totals.shipping) {
            doc.fillColor('#374151')
               .text('Shipping:', leftX, yPos)
               .text(data.totals.shipping, leftX, yPos, { width: rightX - leftX, align: 'right' });
            yPos += bodyLineHeight + 2;
        }
        
        // Tax breakdown (already formatted strings)
        if (data.totals.cgst && data.totals.sgst) {
            doc.text('CGST:', leftX, yPos)
               .text(data.totals.cgst, leftX, yPos, { width: rightX - leftX, align: 'right' });
            yPos += bodyLineHeight + 2;
            
            doc.text('SGST:', leftX, yPos)
               .text(data.totals.sgst, leftX, yPos, { width: rightX - leftX, align: 'right' });
            yPos += bodyLineHeight + 2;
        } else if (data.totals.igst) {
            doc.text('IGST:', leftX, yPos)
               .text(data.totals.igst, leftX, yPos, { width: rightX - leftX, align: 'right' });
            yPos += bodyLineHeight + 2;
        } else if (data.totals.gst) {
            doc.text('GST:', leftX, yPos)
               .text(data.totals.gst, leftX, yPos, { width: rightX - leftX, align: 'right' });
            yPos += bodyLineHeight + 2;
        }
        
        // Separator line before total
        yPos += 5;
        doc.moveTo(350, yPos)
           .lineTo(535, yPos)
           .strokeColor(colorScheme.primary)
           .lineWidth(1)
           .stroke();
        
        yPos += 10;
        
        // Grand Total with accent color (already formatted string)
        doc.font(fontFamily + '-Bold')
           .fontSize(bodySize + 3)
           .fillColor(colorScheme.primary)
           .text('Total:', leftX, yPos)
           .fillColor(colorScheme.accent)
           .text(data.totals.total, leftX, yPos, { width: rightX - leftX, align: 'right' });
        
        return summaryBoxY + summaryBoxHeight + 20;
    },
    
    /**
     * Render footer with notes and decorative elements
     */
    renderFooter(doc, data, yPos, colorScheme, templateConfig = null) {
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const headingSize = templateConfig?.fonts?.headingSize || 16;
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        const bodyLineHeight = bodySize * 1.5;
        
        yPos += bodyLineHeight * 2;
        
        const companyState = templateConfig?.company?.address?.state || 'the respective';
        const companyEmail = templateConfig?.company?.email || null;
        
        if (data.order.notes) {
            // Notes in a colored box
            doc.roundedRect(50, yPos, 495, 10, 6)
               .fillAndStroke(colorScheme.background, colorScheme.border);
            
            doc.font(fontFamily + '-Bold')
               .fontSize(headingSize - 4)
               .fillColor(colorScheme.secondary)
               .text('NOTES', 60, yPos + 15);
            
            yPos += bodyLineHeight + 18;
            doc.font(fontFamily)
               .fontSize(bodySize - 1)
               .fillColor('#111827')
               .text(data.order.notes, 60, yPos, { width: 475 });
            
            yPos += doc.heightOfString(data.order.notes, { width: 475 }) + bodyLineHeight;
            
            if (companyEmail) {
               doc.fontSize(bodySize - 1)
                  .fillColor('#374151')
                  .text(`If you have any questions, please contact at ${companyEmail}`, 60, yPos, { width: 475 });
               yPos += bodyLineHeight + 5;
            }

            doc.fontSize(bodySize - 2)
               .fillColor('#6b7280')
               .text(`All disputes are subject to ${companyState} jurisdiction only. Goods once sold will only be taken back or exchanged as per the store's exchange/return policy`, 60, yPos, { width: 475 });
            
            yPos += doc.heightOfString(`All disputes are subject to ${companyState} jurisdiction only. Goods once sold will only be taken back or exchanged as per the store's exchange/return policy`, { width: 475 });
            yPos += bodyLineHeight * 3;
        }
        
        return yPos;
    },
    
    /**
     * Render signature section (if configured)
     */
    async renderSignature(doc, data, yPos, colorScheme, templateConfig = null) {
        // Check if signature is enabled and filename is provided
        const includeSignature = templateConfig?.company?.includeSignature !== false;
        const signatureFilename = templateConfig?.company?.signature;
        
        if (!includeSignature || !signatureFilename) {
            console.log('Signature disabled or not configured, skipping signature section');
            return yPos;
        }
        
        const fontFamily = templateConfig?.fonts?.family || 'Helvetica';
        const bodySize = templateConfig?.fonts?.bodySize || 11;
        const bodyLineHeight = bodySize * 1.5;
        
        try {
            let signatureBuffer;
            
            // Check if signature is an S3 path (contains /)
            if (signatureFilename.includes('/')) {
                console.log(`Fetching signature from S3: ${signatureFilename}`);
                signatureBuffer = await downloadImageFromS3(signatureFilename);
            } else {
                // Local assets folder
                const signaturePath = join(__dirname, '..', '..', 'assets', signatureFilename);
                const fs = await import('fs');
                signatureBuffer = fs.readFileSync(signaturePath);
            }
            
            yPos += bodyLineHeight * 3;
            
            // Signature in a colorful box
            doc.roundedRect(380, yPos - 10, 165, 80, 6)
               .fillAndStroke(colorScheme.background, colorScheme.border);
            
            // Signature label
            doc.font(fontFamily)
               .fontSize(bodySize - 1)
               .fillColor(colorScheme.secondary)
               .text('Authorized Signatory', 390, yPos, { width: 145, align: 'center' });
            
            // Signature image
            doc.image(signatureBuffer, 405, yPos + 15, { width: 115, height: 40, fit: [115, 40] });
            
            // Line above signature in primary color
            doc.moveTo(390, yPos + 60)
               .lineTo(535, yPos + 60)
               .strokeColor(colorScheme.primary)
               .lineWidth(1.5)
               .stroke();
            
            yPos += bodyLineHeight;
        } catch (error) {
            console.log('Signature image not found or could not be loaded, skipping signature:', error.message);
        }
        
        return yPos;
    },
    
    // Export color scheme generator for external use
    getColorScheme
};
