import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { Quotation } from '@/models/Quotation';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

import connectDB from '@/lib/mongoose'; // assuming lib/mongoose exists based on open files

// Helper function to convert stream to buffer
const streamToBuffer = (stream: any): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on('data', (chunk: any) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    // In a real app, verify authentication
    // const session = await getServerSession();
    // if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // const createdBy = session.user.id;
    const createdBy = new mongoose.Types.ObjectId(); // mock user ID for now

    const body = await req.json();
    const {
      customerName, companyName, customerMobile, customerMobile2, address, pincode, email, customerId,
      quoteNumber, date, validUntil, bdeName, items, additionalServices
    } = body;

    // Backend calculation
    let subtotal = 0;
    let sgstAmount = 0;
    let cgstAmount = 0;

    items.forEach((item: any) => {
      const itemSub = Number(item.unitPrice) * Number(item.quantity);
      subtotal += itemSub;
      if (item.includeGst) {
        sgstAmount += (itemSub * Number(item.sgstPercent)) / 100;
        cgstAmount += (itemSub * Number(item.cgstPercent)) / 100;
      }
    });

    const totalAmount = subtotal + sgstAmount + cgstAmount;

    // Save to DB
    const newQuotation = new Quotation({
      customerName, companyName, customerMobile, customerMobile2, address, pincode, email, customerId,
      quoteNumber, date, validUntil, bdeName, items, additionalServices,
      subtotal, sgstAmount, cgstAmount, totalAmount,
      createdBy
    });
    
    // In production we should handle duplicates
    // await newQuotation.save(); 

    // Generate PDF
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    
    // Header
    const logoPath = path.join(process.cwd(), 'public', 'logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 40, { width: 150 });
      doc.y = 125;
    } else {
      doc.font('Helvetica-Bold').fontSize(26).fillColor('#0A3161').text('AL-MAWA INTERNATIONAL', 40, 40, { align: 'left' });
      doc.fontSize(10).fillColor('#555555').text('TRY. TRUST. TRANSFORM.', { align: 'left' });
      doc.moveDown();
    }

    // Company Info Left & Proforma Right
    const yPos = doc.y;
    doc.fontSize(9).font('Helvetica-Bold').text('Corporate and Registered Office Address:', 40, yPos);
    doc.font('Helvetica').text('1st Floor, Pride Icon, Office No. 102,103, Nexus Work Spaces,\nMundhwa - Kharadi Rd, Above Athithi Restaurant, Kharadi,\nPune, Maharashtra, Pin Code: 411014\nWebsite: www.al-mawa.international\nPhone: +91 9561106693 / +91 9561179693\nGST No: 27ABDCA0474D1Z1\nPAN No: ABDCA0474D', 40, yPos + 25, { width: 250 });

    // Proforma Info Box
    doc.fontSize(16).fillColor('#0A3161').font('Helvetica-Bold').text('PROFORMA INVOICE', 350, yPos);
    doc.rect(350, yPos + 25, 205, 80).stroke('#cccccc');
    doc.fontSize(9).fillColor('black');
    
    const pInfoY = yPos + 30;
    doc.font('Helvetica-Bold').text('DATE:', 355, pInfoY).font('Helvetica').text(date, 430, pInfoY);
    doc.font('Helvetica-Bold').text('PROFORMA NO:', 355, pInfoY + 15).font('Helvetica').text(quoteNumber, 430, pInfoY + 15);
    doc.font('Helvetica-Bold').text('VALID UNTIL:', 355, pInfoY + 30).font('Helvetica').text(validUntil, 430, pInfoY + 30);
    doc.font('Helvetica-Bold').text('BDE Name:', 355, pInfoY + 45).font('Helvetica').text(bdeName, 430, pInfoY + 45);

    // Customer Details
    const custY = Math.max(doc.y, yPos + 120);
    doc.rect(40, custY, 515, 20).fillAndStroke('#0A3161', '#0A3161');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text('CUSTOMER DETAILS', 50, custY + 5);
    
    let currentCustY = custY + 28;
    
    doc.fillColor('black').font('Helvetica-Bold').text('Customer Name:', 50, currentCustY);
    doc.font('Helvetica');
    const nameH = doc.heightOfString(customerName || '', { width: 380 });
    doc.text(customerName, 160, currentCustY, { width: 380 });
    currentCustY += nameH + 5;
    
    doc.font('Helvetica-Bold').text('Company Name:', 50, currentCustY);
    doc.font('Helvetica');
    const compH = doc.heightOfString(companyName || '', { width: 380 });
    doc.text(companyName, 160, currentCustY, { width: 380 });
    currentCustY += compH + 5;
    
    doc.font('Helvetica-Bold').text('Mobile Number:', 50, currentCustY);
    doc.font('Helvetica');
    const mobH = doc.heightOfString(customerMobile || '', { width: 380 });
    doc.text(customerMobile, 160, currentCustY, { width: 380 });
    currentCustY += mobH + 5;
    
    doc.font('Helvetica-Bold').text('Address:', 50, currentCustY);
    doc.font('Helvetica');
    const addH = doc.heightOfString(address || '', { width: 380 });
    doc.text(address, 160, currentCustY, { width: 380 });
    currentCustY += addH + 5;
    
    doc.font('Helvetica-Bold').text('Pincode:', 50, currentCustY);
    doc.font('Helvetica');
    const pinH = doc.heightOfString(pincode || '', { width: 380 });
    doc.text(pincode, 160, currentCustY, { width: 380 });
    currentCustY += pinH + 10;
    
    doc.rect(40, custY + 20, 515, currentCustY - (custY + 20)).stroke('#cccccc');

    // Items Table
    const tableY = currentCustY + 15;
    doc.rect(40, tableY, 515, 20).fillAndStroke('#0A3161', '#0A3161');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text('DESCRIPTION', 50, tableY + 5);
    doc.text('TOTAL AMOUNT', 360, tableY + 5);

    let currentY = tableY + 20;
    
    items.forEach((item: any) => {
      // Simulate height calculation first
      doc.font('Helvetica-Bold').fontSize(10);
      const descHeight = doc.heightOfString(item.description, { width: 300 });
      let detailsHeight = 0;
      let validDetails: string[] = [];

      if (item.serviceDetails) {
        doc.font('Helvetica').fontSize(9).fillColor('#333333');
        const details = item.serviceDetails.split('\n');
        details.forEach((d: string) => {
          const cleanText = d.trim();
          if (cleanText) {
            const bulletText = `• ${cleanText.replace(/^•\s*/, '')}`;
            validDetails.push(bulletText);
            detailsHeight += doc.heightOfString(bulletText, { width: 290 }) + 4;
          }
        });
      }
      
      let amountsHeight = 10 + 20; 
      if (item.includeGst) amountsHeight += 20;
      amountsHeight += 15;
      
      const itemHeight = Math.max(10 + descHeight + 6 + detailsHeight + 10, amountsHeight);
      
      // Page break check if item doesn't fit at all, at least start on a fresh page
      if (currentY + Math.min(itemHeight, 100) > doc.page.height - 40) {
        doc.addPage();
        currentY = 40;
      }
      
      let chunkStartY = currentY;
      
      doc.font('Helvetica-Bold').fontSize(10);
      doc.fillColor('black').text(item.description, 50, chunkStartY + 10, { width: 300 });
      
      let currentTextY = chunkStartY + 10 + descHeight + 6;
      let amountsDrawn = false;

      const drawAmountsFn = (docObj: any, startY: number) => {
          docObj.fontSize(9).fillColor('black');
          const sub = Number(item.unitPrice) * Number(item.quantity);
          docObj.font('Helvetica').text('Base Amount:', 360, startY).text(`Rs. ${sub.toFixed(2)}`, 460, startY);
          
          let nextAmountY = startY + 20;
          if (item.includeGst) {
            const sgstP = Number(item.sgstPercent) || 0;
            const cgstP = Number(item.cgstPercent) || 0;
            const totalGstPercent = sgstP + cgstP;
            const gstAmount = (sub * totalGstPercent) / 100;
            docObj.text(`GST @ ${totalGstPercent}%:`, 360, nextAmountY).text(`Rs. ${gstAmount.toFixed(2)}`, 460, nextAmountY);
            nextAmountY += 20;
          }
          const itemTotal = sub + (item.includeGst ? (sub * (Number(item.sgstPercent) + Number(item.cgstPercent))) / 100 : 0);
          docObj.font('Helvetica-Bold').text('Total Amount:', 360, nextAmountY).text(`Rs. ${itemTotal.toFixed(2)}`, 460, nextAmountY);
      };

      if (validDetails.length > 0) {
        doc.font('Helvetica').fontSize(9).fillColor('#333333');
        for (const bulletText of validDetails) {
          const h = doc.heightOfString(bulletText, { width: 290 });
          
          if (currentTextY + h > doc.page.height - 40) {
            // Finish current chunk
            if (!amountsDrawn) {
                drawAmountsFn(doc, chunkStartY + 10);
                amountsDrawn = true;
            }
            const chunkHeight = currentTextY - chunkStartY;
            doc.rect(40, chunkStartY, 515, chunkHeight).stroke('#cccccc');
            doc.moveTo(350, chunkStartY).lineTo(350, chunkStartY + chunkHeight).stroke('#cccccc');
            
            // Add new page
            doc.addPage();
            chunkStartY = 40;
            currentTextY = chunkStartY + 10;
            
            // Reset font for the next text
            doc.font('Helvetica').fontSize(9).fillColor('#333333');
          }
          
          doc.text(bulletText, 50, currentTextY, { width: 290 });
          currentTextY += h + 4;
        }
      }
      
      currentTextY += 10;
      if (!amountsDrawn) {
          // If amounts not drawn yet, ensure chunk is tall enough
          currentTextY = Math.max(currentTextY, chunkStartY + amountsHeight);
          drawAmountsFn(doc, chunkStartY + 10);
          amountsDrawn = true;
      }
      
      const chunkHeight = currentTextY - chunkStartY;
      doc.rect(40, chunkStartY, 515, chunkHeight).stroke('#cccccc');
      doc.moveTo(350, chunkStartY).lineTo(350, chunkStartY + chunkHeight).stroke('#cccccc');
      
      currentY = chunkStartY + chunkHeight;
    });

    if (additionalServices && additionalServices.length > 0) {
      if (currentY + 60 > doc.page.height - 40) {
        doc.addPage();
        currentY = 40;
      }
      doc.rect(40, currentY + 15, 515, 20).fillAndStroke('#0A3161', '#0A3161');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text('OUR SERVICES ALSO INCLUDE', 50, currentY + 20);
      
      const startAddY = currentY + 35;
      let addY = startAddY + 10;
      doc.fillColor('black').font('Helvetica').fontSize(9);
      
      additionalServices.forEach((s: any) => {
        const textH = doc.heightOfString(`• ${s.description}`, { width: 290 });
        if (addY + textH > doc.page.height - 40) {
          // Break box and start new page
          doc.rect(40, startAddY, 515, addY - startAddY).stroke('#cccccc');
          doc.moveTo(350, startAddY).lineTo(350, addY).stroke('#cccccc');
          doc.addPage();
          addY = 40;
          currentY = 40; // Reset currentY logic if needed, but we don't rely on startAddY after this block
        }
        doc.text(`• ${s.description}`, 50, addY, { width: 290 });
        doc.text(s.amount, 360, addY);
        addY += textH + 8;
      });
      
      // We only draw the final box from where it started on the CURRENT page
      // To properly handle multi-page additional services, it's easier to just assume they fit, or do a simple bounding box.
      // Since it's a simple list, let's just draw the final box for whatever is left on the current page:
      const boxStartY = (addY < startAddY) ? 40 : startAddY; // If we page broke, boxStartY should be 40
      doc.rect(40, boxStartY, 515, addY - boxStartY + 5).stroke('#cccccc');
      doc.moveTo(350, boxStartY).lineTo(350, addY + 5).stroke('#cccccc');
      
      currentY = addY + 5;
    }

    let footerY = currentY + 15;
    let bankDetailsDrawn = false;
    let bankBoxBottom = 0;

    const drawBankDetails = (startY: number) => {
        doc.rect(370, startY, 185, 20).fillAndStroke('#0A3161', '#0A3161');
        doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text('BANK DETAILS', 375, startY + 5);
        
        let bY = startY + 25;
        doc.fillColor('black');
        doc.font('Helvetica-Bold').fontSize(8).text('Bank: ', 375, bY, { continued: true }).font('Helvetica').text('Punjab National Bank');
        bY += 12;
        doc.font('Helvetica-Bold').text('Account Name: ', 375, bY, { continued: true }).font('Helvetica').text('AL-MAWA INTERNATIONAL (OPC) PRIVATE LIMITED', { width: 175 });
        bY += doc.heightOfString('AL-MAWA INTERNATIONAL (OPC) PRIVATE LIMITED', { width: 175 }) + 2;
        doc.font('Helvetica-Bold').text('Account No: ', 375, bY, { continued: true }).font('Helvetica').text('6630002100005155');
        bY += 12;
        doc.font('Helvetica-Bold').text('IFSC: ', 375, bY, { continued: true }).font('Helvetica').text('PUNB0663000');
        bY += 12;
        doc.font('Helvetica-Bold').text('Swift Code: ', 375, bY, { continued: true }).font('Helvetica').text('0300641');
        bY += 12;
        doc.font('Helvetica-Bold').text('Branch: ', 375, bY, { continued: true }).font('Helvetica').text('Kharadi, Pune Maharashtra', { width: 175 });
        
        bY += 25;
        const qrPath = path.join(process.cwd(), 'public', 'qr_code.png');
        if (fs.existsSync(qrPath)) {
          doc.font('Helvetica-Bold').fontSize(8).text('SCAN TO PAY (UPI)', 375, bY, { width: 175, align: 'center' });
          bY += 12;
          doc.image(qrPath, 375 + (175 - 100)/2, bY, { width: 100 });
          bY += 105;
          doc.font('Helvetica-Bold').fontSize(8).text('UPI ID: 9028346900m@pnb', 375, bY, { width: 175, align: 'center' });
        }

        const authSignY = bY + 30;
        doc.moveTo(375, authSignY).lineTo(545, authSignY).stroke('#000000');
        doc.font('Helvetica-Bold').fontSize(9).text("CONCERNED AUTHORITY", 375, authSignY + 5);

        const bottom = authSignY + 20;
        doc.rect(370, startY + 20, 185, bottom - (startY + 20)).stroke('#cccccc');
        return bottom;
    };

    let termsBoxY = footerY;
    let isFirstTermsPage = true;
    let hasBankBoxThisPage = false;
    
    // If Bank Details fit, draw it now. Needs ~285 points.
    if (termsBoxY + 285 <= doc.page.height - 40) {
        bankBoxBottom = drawBankDetails(termsBoxY);
        bankDetailsDrawn = true;
        hasBankBoxThisPage = true;
    }

    const drawTermsHeader = (y: number, hasBankBox: boolean) => {
      const width = hasBankBox ? 320 : 515;
      doc.rect(40, y, width, 20).fillAndStroke('#0A3161', '#0A3161');
      doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text('TERMS AND CONDITIONS', 45, y + 5);
      return y + 25;
    };

    let tY = drawTermsHeader(termsBoxY, hasBankBoxThisPage);
    let termsStartY = termsBoxY + 20;
    doc.fillColor('black').font('Helvetica').fontSize(7);
    
    const terms = [
      "Valid for 3 days from the date of issue; prices may change thereafter.",
      "Covers only the services mentioned; additional work will be charged separately.",
      "Prices are exclusive of GST and other applicable taxes (Terms and Conditions Applied)*.",
      "An advance payment of 30% shall be payable upon confirmation of the order, with the remaining balance due upon completion of the agreed project milestones.",
      "Delays beyond 7 days in payment are subject to a fine of Rs. 250 per day.",
      "Timely submission of required content/materials is mandatory.",
      "Both parties must keep all shared information confidential.",
      "No cancellation after 24 hours; 10% refund only if no work has started.",
      "No refund once work has commenced or deliverables are shared.",
      "Final deliverables belong to the client after full payment.",
      "Timely part payments during the service period are crucial for maintaining the continuity and smooth execution of the project.",
      "Al-Mawa may use completed work for its portfolio unless agreed otherwise.",
      "Al-Mawa is not liable for indirect or consequential damages.",
      "Force Majeure clause will be applicable.",
      "Disputes to be resolved under Pune and Mumbai, Maharashtra jurisdiction.",
      "Client accepts these terms by confirming the quotation or making payment.",
      "The entire work will be submitted within the specified time as mentioned in the agreement.",
      "Subject to clearance.",
      "In case of cheque bounce, the client is subject to a Rs. 1000 fine.",
      "Cash payments are not accepted.",
      "The project will begin only after the payment has been successfully received. Once payment is confirmed, a minimum of 7 working days is required to initiate and progress the work.",
      "Payments should be transferred only to the company official bank account. Any payment made to other accounts will be solely the responsibility of the payer.",
      "--- FOR WEB/SOFTWARE DEVELOPMENT PROJECTS ---",
      "Third-Party Services: All external APIs, third-party services, and integrations required for the project will be charged separately and shall be borne by the customer.",
      "Server & Hosting: All server, VPS, hosting, and cloud infrastructure charges will be borne by the customer.",
      "Database: Any database-related charges, including MongoDB Atlas or other database services, will be charged separately to the customer.",
      "Deployment: Any deployment, cloud infrastructure, or related service charges will be borne by the customer.",
      "Domain: Domain registration, renewal, transfer, and related charges will be paid by the customer.",
      "Cloud Services: Any charges for Cloudinary, Cloudflare, AWS, or other cloud storage/CDN services will be borne by the customer.",
      "API & Subscription Charges: Any charges for SMS, WhatsApp, email, payment gateways, AI services, or other subscription/usage-based APIs will be paid separately by the customer.",
      "Recurring Charges: All recurring subscription, renewal, storage, bandwidth, and API usage charges after deployment will be the customer's responsibility.",
      "Account & Billing: Third-party accounts and services should preferably be registered under the customer's name and billing details.",
      "Note: The above charges are not included in the development/project cost mentioned in this quotation and will be billed separately based on actual third-party service charges."
    ];

    for (let i = 0; i < terms.length; i++) {
      const term = terms[i];
      let boxWidth = hasBankBoxThisPage ? 310 : 505;
      let h = doc.heightOfString(`• ${term}`, { width: boxWidth });
      
      if (tY + h > doc.page.height - 40) {
        doc.rect(40, termsStartY, hasBankBoxThisPage ? 320 : 515, tY - termsStartY).stroke('#cccccc');
        doc.addPage();
        isFirstTermsPage = false;
        termsBoxY = 40;
        
        hasBankBoxThisPage = false;
        if (!bankDetailsDrawn) {
            bankBoxBottom = drawBankDetails(termsBoxY);
            bankDetailsDrawn = true;
            hasBankBoxThisPage = true;
        }

        tY = termsBoxY + 5;
        termsStartY = termsBoxY;
        doc.fillColor('black').font('Helvetica').fontSize(7);
        
        // Recalculate width and height for the new page context
        boxWidth = hasBankBoxThisPage ? 310 : 505;
        h = doc.heightOfString(`• ${term}`, { width: boxWidth });
      }
      
      doc.text(`• ${term}`, 45, tY, { width: boxWidth });
      tY += h + 2;
    }

    tY += 15;
    if (tY + 30 > doc.page.height - 40) {
        doc.rect(40, termsStartY, hasBankBoxThisPage ? 320 : 515, tY - 15 - termsStartY).stroke('#cccccc');
        doc.addPage();
        isFirstTermsPage = false;
        termsBoxY = 40;
        
        hasBankBoxThisPage = false;
        if (!bankDetailsDrawn) {
            bankBoxBottom = drawBankDetails(termsBoxY);
            bankDetailsDrawn = true;
            hasBankBoxThisPage = true;
        }
        
        tY = 40;
        termsStartY = 40;
    }

    doc.font('Helvetica-Oblique').text("Customer Acceptance (Sign below):", 45, tY);
    tY += 25;
    doc.moveTo(45, tY).lineTo(200, tY).stroke('#000000');
    tY += 5;

    doc.rect(40, termsStartY, hasBankBoxThisPage ? 320 : 515, tY - termsStartY).stroke('#cccccc');

    let finalY = tY + 20;
    if (hasBankBoxThisPage) {
        finalY = Math.max(tY, bankBoxBottom) + 20;
    }
    
    // Just in case terms were very short and didn't trigger a page break, but Bank Box didn't fit
    if (!bankDetailsDrawn) {
        doc.addPage();
        bankBoxBottom = drawBankDetails(40);
        hasBankBoxThisPage = true;
        finalY = bankBoxBottom + 20;
    }

    if (finalY + 20 > doc.page.height - 40) {
        doc.addPage();
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0078D7').text('Thank You For The Opportunity!', 40, 40, { align: 'center', width: 515 });
    } else {
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#0078D7').text('Thank You For The Opportunity!', 40, finalY, { align: 'center', width: 515 });
    }

    doc.end();

    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });
    });

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quotation_${quoteNumber}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Quotation Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
