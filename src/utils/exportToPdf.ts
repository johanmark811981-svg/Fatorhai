import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Print or Export DOM element to PDF with 100% accurate Arabic typography (Cairo font, connected ligatures).
 */
export function printElement(elementId: string, filename: string = 'document.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn('Target element not found for printing:', elementId);
    window.print();
    return;
  }

  const cleanTitle = filename.replace(/\.pdf$/i, '').replace(/_/g, ' ');
  const htmlContent = element.outerHTML;

  // Copy all style tags and stylesheets from the main document head for 100% fidelity
  const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(node => node.outerHTML)
    .join('\n');

  const printWindow = window.open('', '_blank', 'width=1000,height=900');

  if (!printWindow) {
    // If popup was blocked, fallback to direct window.print
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${cleanTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        ${headStyles}
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box !important;
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          }
          body {
            font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
            background-color: #0f172a;
            color: #1e293b;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            direction: rtl;
          }
          .top-bar {
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            background: #1e293b;
            color: #ffffff;
            padding: 14px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: 0 4px 20px rgba(0,0,0,0.4);
            border-bottom: 1px solid rgba(255,255,255,0.1);
            z-index: 99999;
          }
          .btn {
            cursor: pointer;
            border: none;
            padding: 9px 20px;
            border-radius: 10px;
            font-weight: 700;
            font-size: 14px;
            font-family: 'Cairo', sans-serif !important;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
          }
          .btn-print {
            background: #0d9488;
            color: white;
            box-shadow: 0 2px 8px rgba(13,148,136,0.3);
          }
          .btn-print:hover {
            background: #0f766e;
          }
          .btn-close {
            background: #ef4444;
            color: white;
            box-shadow: 0 2px 8px rgba(239,68,68,0.3);
          }
          .btn-close:hover {
            background: #dc2626;
          }
          .printable-wrapper {
            max-width: 900px;
            margin: 20px auto;
            background: #ffffff;
            color: #000000;
            padding: 24px;
            border-radius: 16px;
            box-shadow: 0 12px 35px rgba(0,0,0,0.4);
          }
          /* Ensure hidden elements in host document display cleanly when printed */
          .printable-wrapper #batch-invoices-printable-container,
          .printable-wrapper #invoice-printable-container,
          .printable-wrapper #receipt-printable-container,
          .printable-wrapper #accounts-list-container,
          .printable-wrapper #financial-report-container,
          .printable-wrapper #personal-expenses-printable-list,
          .printable-wrapper #personal-debts-printable-container,
          .printable-wrapper > * {
            display: block !important;
            position: static !important;
            left: auto !important;
            top: auto !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
            background-color: #ffffff !important;
          }
          .printable-wrapper [data-invoice-id] {
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .printable-wrapper [data-invoice-id]:last-child {
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-after: auto !important;
            break-after: auto !important;
          }
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background: #ffffff !important;
              color: #000000 !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .printable-wrapper {
              margin: 0 !important;
              padding: 0 !important;
              box-shadow: none !important;
              border-radius: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
            }
            .printable-wrapper [data-invoice-id] {
              page-break-after: always !important;
              break-after: page !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            .printable-wrapper [data-invoice-id]:last-child {
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-after: auto !important;
              break-after: auto !important;
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="top-bar no-print">
          <div style="display: flex; flex-direction: column; gap: 3px;">
            <div style="font-weight: 800; font-size: 15px; display: flex; align-items: center; gap: 8px;">
              📄 معاينة المستند والطباعة (PDF)
            </div>
            <div style="font-size: 12px; font-weight: 600; color: #cbd5e1;">
              💡 للتحميل بصيغة PDF عالية الدقة: اختر <span style="color: #38bdf8; font-weight: 700;">"حفظ بتنسيق PDF" (Save as PDF)</span> من قائمة خيارات الطابعة
            </div>
          </div>
          <div style="display: flex; gap: 12px; align-items: center;">
            <button class="btn btn-print" onclick="window.print()">🖨️ طباعة / حفظ كـ PDF</button>
            <button class="btn btn-close" onclick="window.close()">✖ إغلاق والرجوع للبرنامج</button>
          </div>
        </div>
        <div class="printable-wrapper">
          ${htmlContent}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Clean oklch and oklab from a document clone so html2canvas doesn't crash
 */
function sanitizeClonedDocForHtml2Canvas(clonedDoc: Document) {
  // Enforce normal letter spacing for proper Arabic letter connections
  const letterSpacingStyle = clonedDoc.createElement('style');
  letterSpacingStyle.textContent = `
    * {
      letter-spacing: normal !important;
      word-spacing: normal !important;
    }
  `;
  clonedDoc.head?.appendChild(letterSpacingStyle);

  // Replace oklch/oklab in all <style> tags
  const styleTags = clonedDoc.querySelectorAll('style');
  styleTags.forEach((styleTag) => {
    if (styleTag.textContent && (styleTag.textContent.includes('oklch') || styleTag.textContent.includes('oklab'))) {
      styleTag.textContent = styleTag.textContent
        .replace(/oklch\([^)]+\)/gi, '#475569')
        .replace(/oklab\([^)]+\)/gi, '#475569');
    }
  });

  // Replace oklch in inline styles
  const allEls = clonedDoc.querySelectorAll<HTMLElement>('*');
  allEls.forEach((el) => {
    const styleAttr = el.getAttribute('style');
    if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
      el.setAttribute(
        'style',
        styleAttr.replace(/oklch\([^)]+\)/gi, '#475569').replace(/oklab\([^)]+\)/gi, '#475569')
      );
    }
  });
}

/**
 * Direct PDF File Download for Single Element (No popup print window).
 */
export async function exportElementToPdf(
  elementId: string,
  filename: string = 'financial-report.pdf',
  _bgColor: string = '#ffffff'
) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn('Target element not found for PDF export:', elementId);
    return;
  }

  const origDisplay = element.style.display;
  const origPos = element.style.position;
  const origLeft = element.style.left;
  const origTop = element.style.top;
  const origVisibility = element.style.visibility;

  element.style.display = 'block';
  element.style.visibility = 'visible';
  if (origDisplay === 'none' || element.offsetWidth === 0) {
    element.style.position = 'fixed';
    element.style.left = '-9999px';
    element.style.top = '0';
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 0,
      onclone: (clonedDoc) => {
        sanitizeClonedDocForHtml2Canvas(clonedDoc);
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= 297;

    while (heightLeft > 5) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= 297;
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (err) {
    console.error('PDF Export Error:', err);
    printElement(elementId, filename);
  } finally {
    element.style.display = origDisplay;
    element.style.position = origPos;
    element.style.left = origLeft;
    element.style.top = origTop;
    element.style.visibility = origVisibility;
  }
}

/**
 * Direct PDF File Download for Batch Invoices (No popup print window).
 */
export async function exportBatchInvoicesDirectPdf(
  containerId: string,
  filename: string = 'invoices_batch.pdf',
  onProgress?: (progress: number) => void
) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('Batch container not found:', containerId);
    return;
  }

  const invoicesToExport = Array.from(container.querySelectorAll('[data-invoice-id]'));
  if (invoicesToExport.length === 0) return;

  const origDisplay = container.style.display;
  const origPos = container.style.position;
  const origLeft = container.style.left;
  const origTop = container.style.top;
  const origZIndex = container.style.zIndex;
  const origVisibility = container.style.visibility;
  const origWidth = container.style.width;

  container.style.display = 'block';
  container.style.visibility = 'visible';
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-9999';
  container.style.width = '800px';
  container.style.backgroundColor = '#ffffff';

  try {
    const pdf = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    for (let i = 0; i < invoicesToExport.length; i++) {
      const el = invoicesToExport[i] as HTMLElement;
      if (onProgress) {
        onProgress(Math.round(((i + 1) / invoicesToExport.length) * 100));
      }

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          sanitizeClonedDocForHtml2Canvas(clonedDoc);
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      if (i > 0) {
        pdf.addPage();
      }
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, Math.min(pdfHeight, 297), undefined, 'FAST');
      await new Promise((res) => setTimeout(res, 30));
    }

    pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  } catch (err) {
    console.error('Batch PDF Export Error:', err);
  } finally {
    container.style.display = origDisplay;
    container.style.position = origPos;
    container.style.left = origLeft;
    container.style.top = origTop;
    container.style.zIndex = origZIndex;
    container.style.visibility = origVisibility;
    container.style.width = origWidth;
  }
}

/**
 * Helper to share document summary via WhatsApp
 */
export function shareViaWhatsApp(title: string, summary: string, phone: string = '') {
  const message = `*${title}*\n\n${summary}\n\nـ تم التصدير عبر تطبيق النواة المالي الشامل`;
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

/**
 * Helper to share document summary via Email
 */
export function shareViaEmail(subject: string, bodyText: string, email: string = '') {
  const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.open(mailtoUrl, '_blank');
}

