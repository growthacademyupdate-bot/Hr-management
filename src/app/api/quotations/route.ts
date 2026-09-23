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
    doc.font('Helvetica').text('1st Floor, Pride Icon, Office No. 102,103, Nexus Work Spaces,\nMundhwa - Kharadi Rd, Above Athithi Restaurant, Kharadi,\nPune, Maharashtra, Pin Code: 411014\nWebsite: www.al-mawa.international\nPhone: +91 9511991736 / +91 9561179693\nGST No: 27ABDCA0474D1Z1\nPAN No: ABDCA0474D', 40, yPos + 25, { width: 250 });

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
        // Redraw table headers
        doc.rect(40, currentY, 515, 20).fillAndStroke('#0A3161', '#0A3161');
        doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text('DESCRIPTION', 50, currentY + 5);
        doc.text('TOTAL AMOUNT', 360, currentY + 5);
        currentY += 20;
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
            // Draw table header
            doc.rect(40, chunkStartY, 515, 20).fillAndStroke('#0A3161', '#0A3161');
            doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text('DESCRIPTION', 50, chunkStartY + 5);
            doc.text('TOTAL AMOUNT', 360, chunkStartY + 5);
            chunkStartY += 20;
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

    let footerY = currentY;
    // We expect the footer to need around 350 pixels of height
    if (footerY + 350 > doc.page.height - 40) {
      doc.addPage();
      footerY = 40;
    } else {
      footerY += 15;
    }

    // Terms and Conditions Box (Left)
    doc.rect(40, footerY, 320, 20).fillAndStroke('#0A3161', '#0A3161');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text('TERMS AND CONDITIONS', 45, footerY + 5);
    
    // Bank Details Box (Right)
    doc.rect(370, footerY, 185, 20).fillAndStroke('#0A3161', '#0A3161');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(10).text('BANK DETAILS', 375, footerY + 5);

    // Terms content
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
      "Payments should be transferred only to the company official bank account. Any payment made to other accounts will be solely the responsibility of the payer."
    ];

    let tY = footerY + 25;
    terms.forEach(term => {
      const h = doc.heightOfString(`• ${term}`, { width: 310 });
      doc.text(`• ${term}`, 45, tY, { width: 310 });
      tY += h + 2;
    });

    tY += 15;
    doc.font('Helvetica-Oblique').text("Customer Acceptance (Sign below):", 45, tY);
    tY += 25;
    doc.moveTo(45, tY).lineTo(200, tY).stroke('#000000');
    tY += 5;

    // Draw the Terms Border Box
    doc.rect(40, footerY + 20, 320, tY - (footerY + 20)).stroke('#cccccc');

    // Bank details content
    let bY = footerY + 25;
    doc.font('Helvetica-Bold').fontSize(8).text('Bank: ', 375, bY, { continued: true }).font('Helvetica').text('Punjab National Bank');
    bY += 12;
    doc.font('Helvetica-Bold').text('Account Name: ', 375, bY, { continued: true }).font('Helvetica').text('AL-MAWA INTERNATIONAL (OPC) PRIVATE LIMITED', { width: 175 });
    const accNameH = doc.heightOfString('AL-MAWA INTERNATIONAL (OPC) PRIVATE LIMITED', { width: 175 });
    bY += accNameH + 2;
    doc.font('Helvetica-Bold').text('Account No: ', 375, bY, { continued: true }).font('Helvetica').text('6630002100005155');
    bY += 12;
    doc.font('Helvetica-Bold').text('IFSC: ', 375, bY, { continued: true }).font('Helvetica').text('PUNB0663000');
    bY += 12;
    doc.font('Helvetica-Bold').text('Swift Code: ', 375, bY, { continued: true }).font('Helvetica').text('0300641');
    bY += 12;
    doc.font('Helvetica-Bold').text('Branch: ', 375, bY, { continued: true }).font('Helvetica').text('Kharadi, Pune Maharashtra', { width: 175 });
    
    // Concerned Authority Signature
    const authSignY = footerY + 160;
    doc.moveTo(375, authSignY).lineTo(545, authSignY).stroke('#000000');
    doc.font('Helvetica-Bold').fontSize(9).text("CONCERNED AUTHORITY", 375, authSignY + 5);

    // Bank Details Border Box - make it match the Terms box height or just cover bank details
    // It's cleaner to make it end at the same height or a bit shorter. We will give it a fixed height relative to authSignY.
    doc.rect(370, footerY + 20, 185, (authSignY + 20) - (footerY + 20)).stroke('#cccccc');

    // Thank You Text at bottom center
    const thankYouY = Math.max(tY, authSignY + 20) + 20;
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#0078D7').text('Thank You For The Opportunity!', 40, thankYouY, { align: 'center', width: 515 });

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
