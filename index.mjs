/**
 * Lambda: generate-pdf-invoice
 *
 * Pure PDF generator — accepts pre-computed invoiceData JSON from the
 * invoice-1 app, generates a PDF, uploads to S3, sends email via SNS.
 *
 * NO business logic (tax calculation, discount distribution, HSN extraction)
 * lives here — all of that is handled by invoiceTransformer.server.ts in
 * the invoice-1 app before this Lambda is invoked.
 *
 * Input (event):
 *   {
 *     invoiceData: { order, customer, shippingAddress, lineItems, totals },
 *     shop: "mystore.myshopify.com",
 *     orderId: "12345",
 *     orderName: "#1001"
 *   }
 *
 * Output:
 *   {
 *     statusCode: 200,
 *     invoiceId: "<uuid>",
 *     fileName: "shops/.../invoice-1001-<ts>.pdf",
 *     s3Url: "<pre-signed URL>",
 *     emailSentTo: "customer@example.com" | null
 *   }
 */

import { randomUUID } from 'crypto';
import { generateInvoicePDF } from './generators/pdfGenerator.mjs';
import { uploadInvoiceToS3 } from './services/s3Service.mjs';
import { sendInvoiceNotification } from './services/snsService.mjs';
import { getTemplateConfig, formatConfigForPDF } from './services/templateConfigService.mjs';

export const handler = async (event) => {
    try {
        console.log('lambda-generate-pdf-invoice invoked');
        console.log('Event keys:', Object.keys(event));

        const { invoiceData, shop, orderId, orderName } = event;

        if (!invoiceData || !shop) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Missing required fields: invoiceData, shop',
                }),
            };
        }

        const invoiceId = randomUUID();
        console.log(`Generating PDF for order ${orderName}, shop ${shop}, invoiceId ${invoiceId}`);

        // 1. Fetch template config from DB (read-only)
        const rawConfig = await getTemplateConfig(shop);
        const templateConfig = formatConfigForPDF(rawConfig);
        console.log(`Using template config from: ${templateConfig.source}`);

        // 2. Generate PDF
        const pdfBuffer = await generateInvoicePDF(invoiceData, templateConfig);
        console.log(`PDF generated: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

        // 3. Upload to S3
        const { fileName, s3Url } = await uploadInvoiceToS3(
            pdfBuffer,
            orderName || invoiceData.order?.name || 'unknown',
            shop
        );
        console.log(`PDF uploaded to S3: ${fileName}`);

        // 4. Send email notification via SNS
        const emailSentTo = await sendInvoiceNotification(invoiceData, s3Url, templateConfig);
        if (emailSentTo) {
            console.log(`Email sent to: ${emailSentTo}`);
        }

        // 5. Return results — NO DB writes (handled by invoice-1 app)
        return {
            statusCode: 200,
            invoiceId,
            fileName,
            s3Url,
            emailSentTo: emailSentTo || null,
        };
    } catch (error) {
        console.error('Error in lambda-generate-pdf-invoice:', error);
        return {
            statusCode: 500,
            error: error.message,
        };
    }
};
