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
const appVersion = document.querySelector('#appVersion');

const DRAFT_STORAGE_KEY = 'comprobantes.bbvaDraft.v1';
const TEMPLATE_STORAGE_KEY = 'comprobantes.bbvaTemplates.v1';
const CUSTOM_TEMPLATE_PREFIX = 'custom-';
const APP_VERSION = 'v1.0.0';
const APP_COMMIT_LABEL = 'codex/edit-app-to-create-templates';

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
  concept: 'concepto',
  amountText: '$ 0.10',
  sourceAccount: '•5639',
  beneficiaryName: 'Omar Alejandro L',
  bankName: 'Cuenta BBVA',
  destinationAccount: '•5629',
  footerText:
    'BBVA México, S.A., Institución de Banca Múltiple, Grupo Financiero BBVA México. Avenida Paseo de la Reforma 510, colonia Juárez, código postal 06600, alcaldía Cuauhtémoc, Ciudad de México.',
};

let customTemplates = [];
const LOGO_PRIMARY_SRC = 'bbva-logo.png';
const LOGO_FALLBACK_SRC = 'bbva-logo.svg';
let resolvedLogoDataUrl = null;
const EXPORT_SETTINGS = {
  format: 'image/jpeg',
  quality: 0.95,
  scale: 2,
  // Set width/height in px (e.g. 512/1536) to force exact output size.
  // Keep null to use the preview's natural rendered size.
  width: 485,
  height: 1600,
};

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

  const bankLogo = preview.querySelector('img.bbva-logo');
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

const blobToDataUrl = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });

const resolveLogoDataUrl = async () => {
  if (resolvedLogoDataUrl) return resolvedLogoDataUrl;
  const candidates = [LOGO_PRIMARY_SRC, LOGO_FALLBACK_SRC];

  for (const asset of candidates) {
    try {
      const response = await fetch(asset, { cache: 'reload' });
      if (!response.ok) continue;
      const blob = await response.blob();
      if (!blob || !blob.size) continue;
      const dataUrl = await blobToDataUrl(blob);
      if (!dataUrl) continue;
      resolvedLogoDataUrl = dataUrl;
      return dataUrl;
    } catch (error) {
      console.warn(`No se pudo cargar ${asset}:`, error);
    }
  }
  return null;
};

const ensureLogoAvailable = async () => {
  const logo = preview.querySelector('img.bbva-logo');
  if (!logo) return;
  const dataUrl = await resolveLogoDataUrl();
  if (dataUrl) logo.src = dataUrl;
  else if (!logo.getAttribute('src')) logo.src = LOGO_FALLBACK_SRC;

  await new Promise((resolve) => {
    const done = () => resolve();
    const timer = setTimeout(done, 1500);
    logo.onload = () => {
      clearTimeout(timer);
      done();
    };
    logo.onerror = () => {
      clearTimeout(timer);
      done();
    };
  });
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
  await ensureLogoAvailable();
  const img = preview.querySelector('img.bbva-logo');
  if (img && !img.complete) {
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
  }

  const logoDataUrl = resolvedLogoDataUrl || (img ? img.src : null);
  const previewBg = getComputedStyle(preview).backgroundColor || '#f7f9f8';

  const sourceCanvas = await html2canvas(preview, {
    backgroundColor: previewBg,
    scale: EXPORT_SETTINGS.scale,
    width: EXPORT_SETTINGS.width || undefined,
    height: EXPORT_SETTINGS.height || undefined,
    useCORS: false,
    allowTaint: false,
    imageTimeout: 15000,
    logging: false,
    foreignObjectRendering: false,
    scrollX: 0,
    scrollY: -window.scrollY,
    windowWidth: document.documentElement.scrollWidth,
    windowHeight: document.documentElement.scrollHeight,
    onclone: (doc) => {
      const clonedPreview = doc.querySelector('#receiptPreview');
      if (clonedPreview && EXPORT_SETTINGS.width && EXPORT_SETTINGS.height) {
        clonedPreview.style.width = `${EXPORT_SETTINGS.width}px`;
        clonedPreview.style.maxWidth = `${EXPORT_SETTINGS.width}px`;
        clonedPreview.style.height = `${EXPORT_SETTINGS.height}px`;
        clonedPreview.style.minHeight = `${EXPORT_SETTINGS.height}px`;
        clonedPreview.style.boxSizing = 'border-box';
      }
      const clonedLogo = doc.querySelector('#receiptPreview img.bbva-logo');
      if (clonedLogo && logoDataUrl) clonedLogo.src = logoDataUrl;
    },
  });

  const targetWidth = EXPORT_SETTINGS.width || sourceCanvas.width;
  const targetHeight = EXPORT_SETTINGS.height || sourceCanvas.height;
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return sourceCanvas.toDataURL(EXPORT_SETTINGS.format, EXPORT_SETTINGS.quality);

  ctx.fillStyle = previewBg;
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  const drawWidth = targetWidth;
  const drawHeight = targetHeight;
  const drawX = 0;
  const drawY = 0;
  ctx.drawImage(sourceCanvas, drawX, drawY, drawWidth, drawHeight);

  // iPhone/Safari-safe fallback: draw logo explicitly on top if available.
  if (img && logoDataUrl) {
    try {
      const previewRect = preview.getBoundingClientRect();
      const logoRect = img.getBoundingClientRect();
      if (previewRect.width > 0 && previewRect.height > 0 && logoRect.width > 0 && logoRect.height > 0) {
        const scaleX = drawWidth / previewRect.width;
        const scaleY = drawHeight / previewRect.height;
        const dx = drawX + (logoRect.left - previewRect.left) * scaleX;
        const dy = drawY + (logoRect.top - previewRect.top) * scaleY;
        const dw = logoRect.width * scaleX;
        const dh = logoRect.height * scaleY;

        const exportImage = await new Promise((resolve) => {
          const logo = new Image();
          logo.onload = () => resolve(logo);
          logo.onerror = () => resolve(null);
          logo.src = logoDataUrl;
        });

        if (exportImage) ctx.drawImage(exportImage, dx, dy, dw, dh);
      }
    } catch (error) {
      console.warn('Logo fallback draw failed:', error);
    }
  }

  return outputCanvas.toDataURL(EXPORT_SETTINGS.format, EXPORT_SETTINGS.quality);
};
const downloadReceipt = async () => {
  try {
    const dataUrl = await captureReceiptImage();
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = 'comprobante.jpg';
    link.click();
  } catch (error) {
    console.error(error);
    alert('No se pudo exportar la imagen. Intenta de nuevo.');
  }
};
const printReceiptImage = async () => {
  try {
    const dataUrl = await captureReceiptImage();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<img src="${dataUrl}" style="max-width:100%">`);
    w.document.close();
    w.print();
  } catch (error) {
    console.error(error);
    alert('No se pudo preparar la imagen para imprimir.');
  }
};


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
  ensureLogoAvailable();
  if (appVersion) {
    appVersion.textContent = `${APP_VERSION} - ${APP_COMMIT_LABEL}`;
  }
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
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  });
}
initialize();


