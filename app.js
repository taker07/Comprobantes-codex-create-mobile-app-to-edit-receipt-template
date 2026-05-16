const form = document.querySelector('#receiptForm');
const preview = document.querySelector('#receiptPreview');
const saveStatus = document.querySelector('#saveStatus');
const selectedTemplateName = document.querySelector('#selectedTemplateName');
const templateSelect = document.querySelector('#templateSelect');
const loadSampleButton = document.querySelector('#loadSample');
const saveTemplateButton = document.querySelector('#saveTemplate');
const deleteTemplateButton = document.querySelector('#deleteTemplate');
const downloadButton = document.querySelector('#downloadButton');
const printButton = document.querySelector('#printButton');
const mobileDownloadButton = document.querySelector('#mobileDownloadButton');
const mobilePrintButton = document.querySelector('#mobilePrintButton');

const DRAFT_STORAGE_KEY = 'comprobantes.receiptDraft.v2';
const TEMPLATE_STORAGE_KEY = 'comprobantes.customTemplates.v2';
const CUSTOM_TEMPLATE_PREFIX = 'custom-';

const defaultTemplates = [
  {
    id: 'classic',
    name: 'Clásica azul',
    title: 'Recibo de pago',
    subtitle: 'Comprobante digital',
    signatureLabel: 'Firma autorizada',
    accentColor: '#1e40af',
    variant: 'classic',
  },
  {
    id: 'modern',
    name: 'Moderna lateral',
    title: 'Comprobante recibido',
    subtitle: 'Documento generado desde la app móvil',
    signatureLabel: 'Validado por',
    accentColor: '#7c3aed',
    variant: 'modern',
  },
  {
    id: 'compact',
    name: 'Compacta verde',
    title: 'Recibo simple',
    subtitle: 'Resumen de pago',
    signatureLabel: 'Recibido conforme',
    accentColor: '#047857',
    variant: 'compact',
  },
];

const sampleReceipt = {
  templateId: 'classic',
  templateName: 'Clásica azul',
  templateTitle: 'Recibo de pago',
  templateSubtitle: 'Comprobante digital',
  templateVariant: 'classic',
  signatureLabel: 'Firma autorizada',
  accentColor: '#1e40af',
  issuer: 'Servicios Andina S.A.S.',
  taxId: 'NIT 901.222.333-4',
  receiptNumber: 'RC-2026-042',
  date: new Date().toISOString().slice(0, 10),
  customer: 'María González',
  concept: 'Pago de anticipo por diseño y desarrollo de aplicación móvil.',
  currency: 'USD',
  amount: '850.00',
  paymentMethod: 'Transferencia bancaria',
  notes: 'Comprobante generado digitalmente. No requiere sello físico.',
};

let customTemplates = [];

const getFormData = () => Object.fromEntries(new FormData(form).entries());

const getTemplates = () => [...defaultTemplates, ...customTemplates];

const getTemplateById = (templateId) => getTemplates().find((template) => template.id === templateId) || defaultTemplates[0];

const isCustomTemplate = (templateId) => templateId?.startsWith(CUSTOM_TEMPLATE_PREFIX);

const persistCustomTemplates = () => {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(customTemplates));
};

const setFormData = (data) => {
  Object.entries(data).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) {
      field.value = value;
    }
  });
};

const fillTemplateFields = (template) => {
  setFormData({
    templateId: template.id,
    templateName: template.name,
    templateTitle: template.title,
    templateSubtitle: template.subtitle,
    templateVariant: template.variant,
    signatureLabel: template.signatureLabel,
    accentColor: template.accentColor,
  });
};

const renderTemplateOptions = (selectedId = defaultTemplates[0].id) => {
  templateSelect.innerHTML = '';
  getTemplates().forEach((template) => {
    const option = document.createElement('option');
    option.value = template.id;
    option.textContent = isCustomTemplate(template.id) ? `${template.name} (personalizada)` : template.name;
    templateSelect.append(option);
  });
  templateSelect.value = getTemplateById(selectedId).id;
};

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

const formatCurrency = (amount, currency) => {
  const numericAmount = Number.parseFloat(amount || 0);
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(numericAmount) ? numericAmount : 0);
};

const getTemplateFromForm = () => {
  const data = getFormData();
  return {
    id: data.templateId || defaultTemplates[0].id,
    name: data.templateName || 'Plantilla sin nombre',
    title: data.templateTitle || 'Recibo de pago',
    subtitle: data.templateSubtitle || 'Comprobante digital',
    signatureLabel: data.signatureLabel || 'Firma autorizada',
    accentColor: data.accentColor || '#1e40af',
    variant: data.templateVariant || 'classic',
  };
};

const updateTemplateControls = () => {
  const data = getFormData();
  const canDelete = isCustomTemplate(data.templateId);
  saveTemplateButton.textContent = canDelete ? 'Actualizar plantilla' : 'Añadir plantilla';
  deleteTemplateButton.hidden = !canDelete;
};

const updatePreview = () => {
  const data = getFormData();
  const activeTemplate = getTemplateFromForm();
  const accent = activeTemplate.accentColor;

  document.documentElement.style.setProperty('--accent', accent);
  document.documentElement.style.setProperty('--accent-soft', `${accent}22`);

  preview.className = `receipt receipt--${activeTemplate.variant}`;
  preview.querySelector('[data-preview="templateTitle"]').textContent = activeTemplate.title;
  preview.querySelector('[data-preview="templateSubtitle"]').textContent = activeTemplate.subtitle;
  preview.querySelector('[data-preview="signatureLabel"]').textContent = activeTemplate.signatureLabel;
  preview.querySelector('[data-preview="issuer"]').textContent = data.issuer || 'Nombre del emisor';
  preview.querySelector('[data-preview="taxId"]').textContent = data.taxId || 'Identificación pendiente';
  preview.querySelector('[data-preview="receiptNumber"]').textContent = data.receiptNumber || '—';
  preview.querySelector('[data-preview="date"]').textContent = formatDate(data.date);
  preview.querySelector('[data-preview="paymentMethod"]').textContent = data.paymentMethod || 'Sin método';
  preview.querySelector('[data-preview="customer"]').textContent = data.customer || 'Cliente';
  preview.querySelector('[data-preview="amount"]').textContent = formatCurrency(data.amount, data.currency);
  preview.querySelector('[data-preview="concept"]').textContent = data.concept || 'Concepto pendiente.';
  preview.querySelector('[data-preview="notes"]').textContent = data.notes || '';
  selectedTemplateName.textContent = `${activeTemplate.name} · ${activeTemplate.variant}`;

  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  updateTemplateControls();
  saveStatus.textContent = 'Guardado local';
};

const handleTemplateChange = () => {
  fillTemplateFields(getTemplateById(templateSelect.value));
  updatePreview();
};

const saveCustomTemplate = () => {
  const formTemplate = getTemplateFromForm();
  const templateId = isCustomTemplate(formTemplate.id) ? formTemplate.id : `${CUSTOM_TEMPLATE_PREFIX}${Date.now()}`;
  const customTemplate = { ...formTemplate, id: templateId };
  const existingIndex = customTemplates.findIndex((template) => template.id === templateId);

  if (existingIndex >= 0) {
    customTemplates[existingIndex] = customTemplate;
  } else {
    customTemplates.push(customTemplate);
  }

  persistCustomTemplates();
  renderTemplateOptions(templateId);
  fillTemplateFields(customTemplate);
  updatePreview();
  saveStatus.textContent = existingIndex >= 0 ? 'Plantilla actualizada' : 'Plantilla añadida';
};

const deleteCustomTemplate = () => {
  const data = getFormData();
  if (!isCustomTemplate(data.templateId)) return;

  customTemplates = customTemplates.filter((template) => template.id !== data.templateId);
  persistCustomTemplates();
  renderTemplateOptions(defaultTemplates[0].id);
  fillTemplateFields(defaultTemplates[0]);
  updatePreview();
  saveStatus.textContent = 'Plantilla eliminada';
};

const captureReceiptImage = async () => {
  if (typeof html2canvas !== 'function') {
    throw new Error('html2canvas no está cargado');
  }

  const canvas = await html2canvas(preview, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    allowTaint: true,
  });

  return canvas.toDataURL('image/png');
};

const downloadReceipt = async () => {
  try {
    const dataUrl = await captureReceiptImage();
    const link = document.createElement('a');
    const number = form.elements.receiptNumber.value || 'recibo';
    link.href = dataUrl;
    link.download = `${number.replaceAll(' ', '-')}.png`;
    link.click();
  } catch (error) {
    console.error(error);
    alert('No se pudo generar la imagen. Intenta de nuevo.');
  }
};

const printReceiptImage = async () => {
  try {
    const dataUrl = await captureReceiptImage();
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('No se pudo abrir la ventana de impresión. Revisa el bloqueador de ventanas emergentes.');
      return;
    }

    printWindow.document.write(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Imprimir comprobante</title>
    <style>
      body {
        margin: 0;
        padding: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        background: #f2f2f2;
      }
      img {
        max-width: 100%;
        height: auto;
        box-shadow: 0 0 20px rgba(0,0,0,0.1);
      }
      @media print {
        body {
          margin: 0;
          background: white;
        }
        img {
          box-shadow: none;
          max-width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <img src="${dataUrl}" alt="Recibo para imprimir" />
    <script>
      window.onload = function() {
        window.print();
      };
    </script>
  </body>
</html>`);
    printWindow.document.close();
  } catch (error) {
    console.error(error);
    alert('No se pudo generar el formato para impresión. Intenta de nuevo.');
  }
};

const initialize = () => {
  customTemplates = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '[]');
  renderTemplateOptions();

  const savedDraft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
  const initialData = savedDraft || sampleReceipt;
  const template = getTemplateById(initialData.templateId);

  fillTemplateFields(template);
  setFormData({ ...initialData, templateId: template.id });
  updatePreview();
};

form.addEventListener('input', () => {
  saveStatus.textContent = 'Actualizando…';
  updatePreview();
});

templateSelect.addEventListener('change', handleTemplateChange);

loadSampleButton.addEventListener('click', () => {
  renderTemplateOptions(sampleReceipt.templateId);
  setFormData(sampleReceipt);
  updatePreview();
});

saveTemplateButton.addEventListener('click', saveCustomTemplate);
deleteTemplateButton.addEventListener('click', deleteCustomTemplate);
downloadButton.addEventListener('click', downloadReceipt);
mobileDownloadButton.addEventListener('click', downloadReceipt);
printButton.addEventListener('click', printReceiptImage);
mobilePrintButton.addEventListener('click', printReceiptImage);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js');
  });
}

initialize();
