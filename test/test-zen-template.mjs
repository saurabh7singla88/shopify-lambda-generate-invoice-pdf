import { generateInvoicePDF } from '../generators/pdfGenerator.mjs';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Override template to use Zen
process.env.INVOICE_TEMPLATE = 'zen';

// Set local assets path for testing (no S3 required)
process.env.LOCAL_ASSETS_PATH = 'C:\\Users\\saura\\Downloads\\Logo GST';

// Sample invoice data
const invoiceData = {
    order: {
        name: '#PG1229',
        orderNumber: 'PG1229',
        invoiceNumber: 'INV-PG1229',
        date: '2025-12-29',
        invoiceDate: '2025-12-29',
        notes: 'Please handle with care. Gift wrapping requested.'
    },
    customer: {
        name: 'Dan Brown',
        phone: '9769003006',
        email: 'dan.brown@example.com',
        billingAddress: {
            address1: '123 Road ABC Colony Borivali East',
            address2: 'C-102 - ABC Tower',
            city: 'Mumbai',
            province: 'Maharashtra',
            provinceCode: 'MH',
            zip: '400066',
            country: 'India',
            countryCode: 'IN'
        }
    },
    lineItems: [
        {
            name: 'Pleated Trousers | Latte Cream',
            description: 'Variant: XS',
            quantity: 1,
            mrp: 2590.00,
            discount: 400.00,
            priceBeforeTax: 2085.71,
            igst: 104.29,
            cgst: 0,
            sgst: 0,
            gst: 104.29,
            priceAfterTax: 2190.00
        }
    ],
    totals: {
        subtotal: 2590.00,
        discount: 400.00,
        shipping: 0.00,
        igst: 104.29,
        cgst: 0,
        sgst: 0,
        gst: 104.29,
        total: 2190.00
    }
};

console.log('🎨 Testing Zen Template PDF generation (lambda-generate-pdf-invoice)...\n');
console.log('📋 Template: zen (colorful design)');
console.log('🎨 Colors: Indigo (#6366f1), Purple (#8b5cf6), Pink (#ec4899)\n');

try {
    // Test with custom Zen template configuration
    const zenTemplateConfig = {
        colors: {
            primary: '#6366f1',      // Indigo
            secondary: '#8b5cf6',    // Purple
            accent: '#ec4899',       // Pink
            border: '#e0e7ff',       // Light indigo
            background: '#faf5ff',   // Very light purple
            success: '#10b981',      // Green
            error: '#ef4444'         // Red
        },
        fonts: {
            family: 'Helvetica',
            titleSize: 32,
            headingSize: 18,
            bodySize: 11,
            tableSize: 8
        },
        styling: {
            headerBackgroundColor: '#6366f1',
            headerTextColor: '#ffffff'
        },
        company: {
            name: 'ABC Fashion',
            legalName: 'ABC Retail Pvt Ltd',
            gstin: '1234567890AJD67',
            email: 'support@abc.com',
            logo: 'GSTGo.JPG',
            address: {
                line1: '123 Fashion Street',
                line2: 'Andheri West',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400058'
            }
        }
    };
    
    // Generate PDF with Zen template
    console.log('📄 Generating PDF with Zen template...');
    const pdfBuffer = await generateInvoicePDF(invoiceData, zenTemplateConfig);
    
    // Save to file in test folder
    const fileName = `test-zen-invoice-${invoiceData.order.name.replace('#', '')}.pdf`;
    const filePath = join(__dirname, fileName);
    await fs.promises.writeFile(filePath, pdfBuffer);
    
    console.log(`\n✅ Success!`);
    console.log(`📁 PDF saved: ${fileName}`);
    console.log(`📊 Size: ${(pdfBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`\n🎨 Zen Template Features:`);
    console.log(`   ✓ Colorful gradient header with indigo background`);
    console.log(`   ✓ Pink accent bars and decorative elements`);
    console.log(`   ✓ Rounded boxes for customer info and totals`);
    console.log(`   ✓ Alternating row colors in items table`);
    console.log(`   ✓ Color-coded prices (green for totals, red for discounts)`);
    console.log(`   ✓ Decorative footer bar with thank you message`);
    console.log(`\n👀 Open the file to view the colorful Zen template!`);
    
} catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
}
