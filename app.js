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
const exportTemplatesButton = document.querySelector('#exportTemplates');
const importTemplatesInput = document.querySelector('#importTemplatesInput');

const DRAFT_STORAGE_KEY = 'comprobantes.bbvaDraft.v1';
const TEMPLATE_STORAGE_KEY = 'comprobantes.bbvaTemplates.v1';
const CUSTOM_TEMPLATE_PREFIX = 'custom-';

const defaultTemplates = [
  {
    id: 'bbva',
    name: 'BBVA estándar',
    bankBrand: 'BBVA',
    operationHeading: 'COMPROBANTE DE LA OPERACION',
    footerText:
      'BBVA México, S.A., Institución de Banca Múltiple, Grupo Financiero BBVA México. Avenida Paseo de la Reforma 510, colonia Juárez, código postal 06600, alcaldía Cuauhtémoc, Ciudad de México.',
  },
];

const sampleReceipt = {
  templateId: 'bbva',
  templateName: 'BBVA estándar',
  bankBrand: 'BBVA',
  operationHeading: 'COMPROBANTE DE LA OPERACION',
  operationType: 'Transferencia a terceros',
  folio: '0037466735',
  dateText: '16 mayo 2026',
  timeText: '12:27 h',
  concept: 'x favor regresa depo',
  amountText: '$ 0.10',
  sourceAccount: '•5639',
  beneficiaryName: 'Omar Alejandro L',
  bankName: 'Cuenta BBVA',
  destinationAccount: '•5629',
  footerText:
    'BBVA México, S.A., Institución de Banca Múltiple, Grupo Financiero BBVA México. Avenida Paseo de la Reforma 510, colonia Juárez, código postal 06600, alcaldía Cuauhtémoc, Ciudad de México.',
};

let customTemplates = [];

const getFormData = () => Object.fromEntries(new FormData(form).entries());
const getTemplates = () => [...defaultTemplates, ...customTemplates];
const getTemplateById = (templateId) => getTemplates().find((t) => t.id === templateId) || defaultTemplates[0];
const isCustomTemplate = (templateId) => templateId?.startsWith(CUSTOM_TEMPLATE_PREFIX);
const persistCustomTemplates = () => localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(customTemplates));

const setFormData = (data) => {
  Object.entries(data).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
};

const fillTemplateFields = (template) => {
  setFormData({
    templateId: template.id,
    templateName: template.name,
    bankBrand: template.bankBrand,
    operationHeading: template.operationHeading,
    footerText: template.footerText,
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

const getTemplateFromForm = () => {
  const data = getFormData();
  return {
    id: data.templateId || defaultTemplates[0].id,
    name: data.templateName || 'Plantilla sin nombre',
    bankBrand: data.bankBrand || 'BBVA',
    operationHeading: data.operationHeading || 'COMPROBANTE DE LA OPERACION',
    footerText: data.footerText || defaultTemplates[0].footerText,
  };
};

const updateTemplateControls = () => {
  const canDelete = isCustomTemplate(getFormData().templateId);
  saveTemplateButton.textContent = canDelete ? 'Actualizar plantilla' : 'Añadir plantilla';
  deleteTemplateButton.hidden = !canDelete;
};

const updatePreview = () => {
  const data = getFormData();
  const template = getTemplateFromForm();

  const bankLogo = preview.querySelector('[data-preview="bankLogo"]');
  if (bankLogo) bankLogo.alt = template.bankBrand || 'BBVA';
  preview.querySelector('[data-preview="operationHeading"]').textContent = template.operationHeading;
  preview.querySelector('[data-preview="operationType"]').textContent = data.operationType || 'Transferencia a terceros';
  preview.querySelector('[data-preview="folio"]').textContent = data.folio || '0000000000';
  preview.querySelector('[data-preview="dateText"]').textContent = data.dateText || '16 mayo 2026';
  preview.querySelector('[data-preview="timeText"]').textContent = data.timeText || '12:27 h';
  preview.querySelector('[data-preview="concept"]').textContent = data.concept || 'Sin concepto';
  preview.querySelector('[data-preview="amountText"]').textContent = data.amountText || '$ 0.00';
  preview.querySelector('[data-preview="sourceAccount"]').textContent = data.sourceAccount || '•0000';
  preview.querySelector('[data-preview="beneficiaryName"]').textContent = data.beneficiaryName || 'Beneficiario';
  preview.querySelector('[data-preview="bankName"]').textContent = data.bankName || 'Cuenta BBVA';
  preview.querySelector('[data-preview="destinationAccount"]').textContent = data.destinationAccount || '•0000';
  preview.querySelector('[data-preview="footerText"]').textContent = template.footerText;

  selectedTemplateName.textContent = template.name;
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
  const existingIndex = customTemplates.findIndex((t) => t.id === templateId);
  if (existingIndex >= 0) customTemplates[existingIndex] = customTemplate;
  else customTemplates.push(customTemplate);

  persistCustomTemplates();
  renderTemplateOptions(templateId);
  fillTemplateFields(customTemplate);
  updatePreview();
  saveStatus.textContent = existingIndex >= 0 ? 'Plantilla actualizada' : 'Plantilla añadida';
};

const deleteCustomTemplate = () => {
  const data = getFormData();
  if (!isCustomTemplate(data.templateId)) return;
  customTemplates = customTemplates.filter((t) => t.id !== data.templateId);
  persistCustomTemplates();
  renderTemplateOptions(defaultTemplates[0].id);
  fillTemplateFields(defaultTemplates[0]);
  updatePreview();
  saveStatus.textContent = 'Plantilla eliminada';
};

const captureReceiptImage = async () => {
  const originalWidth = preview.style.width;
  const originalMaxWidth = preview.style.maxWidth;
  preview.style.width = '485px';
  preview.style.maxWidth = '485px';

  const sourceCanvas = await html2canvas(preview, { backgroundColor: '#f2f2f2', scale: 2, useCORS: true, allowTaint: true });

  preview.style.width = originalWidth;
  preview.style.maxWidth = originalMaxWidth;

  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = 485;
  outputCanvas.height = 1600;
  const ctx = outputCanvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
    ctx.imageSmoothingEnabled = true;

    const sourceWidth = 485;
    const sourceHeight = Math.round((sourceCanvas.height / sourceCanvas.width) * 485);
    let drawWidth = 485;
    let drawHeight = sourceHeight;
    if (sourceHeight > 1600) {
      drawHeight = 1600;
      drawWidth = Math.round((485 / sourceHeight) * 1600);
    }
    const drawX = Math.round((outputCanvas.width - drawWidth) / 2);
    const drawY = Math.round((outputCanvas.height - drawHeight) / 2);

    ctx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);
  }
  return outputCanvas.toDataURL('image/png');
};
const downloadReceipt = async () => { const dataUrl = await captureReceiptImage(); const link = document.createElement('a'); link.href = dataUrl; link.download = 'comprobante.png'; link.click(); };
const printReceiptImage = async () => { const dataUrl = await captureReceiptImage(); const w = window.open('', '_blank'); if (!w) return; w.document.write(`<img src="${dataUrl}" style="max-width:100%">`); w.document.close(); w.print(); };


const normalizeTemplate = (template) => ({
  id: template.id || `${CUSTOM_TEMPLATE_PREFIX}${Date.now()}`,
  name: template.name || 'Plantilla importada',
  bankBrand: template.bankBrand || 'BBVA',
  operationHeading: template.operationHeading || 'COMPROBANTE DE LA OPERACION',
  footerText: template.footerText || defaultTemplates[0].footerText,
});

const exportCustomTemplates = () => {
  const blob = new Blob([JSON.stringify(customTemplates, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'comprobantes-templates.json';
  link.click();
  URL.revokeObjectURL(url);
  saveStatus.textContent = 'Plantillas exportadas';
};

const importCustomTemplates = async (event) => {
  const [file] = event.target.files || [];
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    if (!Array.isArray(payload)) throw new Error('Formato inválido');

    const incoming = payload.map(normalizeTemplate).map((template) => ({
      ...template,
      id: template.id.startsWith(CUSTOM_TEMPLATE_PREFIX) ? template.id : `${CUSTOM_TEMPLATE_PREFIX}${template.id}`,
    }));

    const base = customTemplates.filter((item) => !incoming.some((next) => next.id === item.id));
    customTemplates = [...base, ...incoming];

    persistCustomTemplates();
    renderTemplateOptions(incoming.at(-1)?.id || defaultTemplates[0].id);
    fillTemplateFields(getTemplateById(templateSelect.value));
    updatePreview();
    saveStatus.textContent = 'Plantillas importadas';
  } catch (error) {
    console.error(error);
    alert('No se pudieron importar las plantillas. Revisa el archivo JSON.');
  } finally {
    importTemplatesInput.value = '';
  }
};

const initialize = () => {
  customTemplates = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '[]').map(normalizeTemplate);
  renderTemplateOptions();
  const savedDraft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
  const initialData = savedDraft || sampleReceipt;
  const template = getTemplateById(initialData.templateId);
  fillTemplateFields(template);
  setFormData({ ...initialData, templateId: template.id });
  updatePreview();
};

form.addEventListener('input', () => { saveStatus.textContent = 'Actualizando…'; updatePreview(); });
templateSelect.addEventListener('change', handleTemplateChange);
loadSampleButton.addEventListener('click', () => { renderTemplateOptions(sampleReceipt.templateId); setFormData(sampleReceipt); updatePreview(); });
saveTemplateButton.addEventListener('click', saveCustomTemplate);
deleteTemplateButton.addEventListener('click', deleteCustomTemplate);
exportTemplatesButton.addEventListener('click', exportCustomTemplates);
importTemplatesInput.addEventListener('change', importCustomTemplates);
downloadButton.addEventListener('click', downloadReceipt);
mobileDownloadButton.addEventListener('click', downloadReceipt);
printButton.addEventListener('click', printReceiptImage);
mobilePrintButton.addEventListener('click', printReceiptImage);
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
initialize();
