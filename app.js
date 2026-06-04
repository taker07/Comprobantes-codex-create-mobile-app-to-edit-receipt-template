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
const templateOverlay = document.querySelector('#templateOverlay');

const DRAFT_STORAGE_KEY = 'comprobantes.bbvaDraft.v1';
const TEMPLATE_STORAGE_KEY = 'comprobantes.bbvaTemplates.v1';
const CUSTOM_TEMPLATE_PREFIX = 'custom-';

const fallbackTemplates = [
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
  amountDisplay: '$ 2,800.00 MN',
  destinatarioNombre: 'DAVID M**** M**** M****',
  destinatarioBanco: 'BANORTE',
  sourceAccountSuffix: '0185',
  destinationCardSuffix: '5963',
  conceptoTransferencia: 'David Morales porton',
  aliasDestinatario: 'porton',
  operationDateTime: '25-05-2026 - 17:49:00',
  footerText:
    'BBVA México, S.A., Institución de Banca Múltiple, Grupo Financiero BBVA México. Avenida Paseo de la Reforma 510, colonia Juárez, código postal 06600, alcaldía Cuauhtémoc, Ciudad de México.',
};

let customTemplates = [];
let systemTemplates = [...fallbackTemplates];
const LOGO_PRIMARY_SRC = 'bbva-logo.png';
const LOGO_FALLBACK_SRC = 'bbva-logo.svg';
let resolvedLogoDataUrl = null;
const templateAssetDataUrlCache = new Map();
const EXPORT_SETTINGS = {
  format: 'image/png',
  quality: 0.95,
  scale: 3,
  // Set width/height in px (e.g. 512/1536) to force exact output size.
  // Keep null to use the preview's natural rendered size.
  width: 485,
  height: 1600,
};
const DEFAULT_OVERLAY_FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const getFormData = () => Object.fromEntries(new FormData(form).entries());
const getTemplates = () => [...systemTemplates, ...customTemplates];
const getTemplateById = (templateId) => getTemplates().find((t) => t.id === templateId) || systemTemplates[0];
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

const renderTemplateOptions = (selectedId = systemTemplates[0].id) => {
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
    id: data.templateId || systemTemplates[0].id,
    name: data.templateName || 'Plantilla sin nombre',
    bankBrand: data.bankBrand || 'BBVA',
    operationHeading: data.operationHeading || 'COMPROBANTE DE LA OPERACION',
    footerText: data.footerText || systemTemplates[0].footerText,
  };
};

const BANORTE_OVERLAY_FIELDS = [
  'amountDisplay',
  'destinatarioNombre',
  'destinatarioBanco',
  'sourceAccountSuffix',
  'destinationCardSuffix',
  'conceptoTransferencia',
  'aliasDestinatario',
  'operationDateTime',
];

const getSelectedTemplate = () => getTemplateById(getFormData().templateId);

const splitAmountDisplay = (value) => {
  const text = typeof value === 'string' ? value.trim() : '';
  const match = text.match(/^([^0-9-]*?)\s*([-+]?\d[\d,]*(?:\.\d+)?)\s*([^0-9]*)$/);
  if (!match) return { currency: '', amount: text, suffix: '' };
  return {
    currency: match[1].trim(),
    amount: match[2],
    suffix: match[3].trim(),
  };
};

const getOverlayText = (layer, values) => {
  const value = values[layer.field];
  if (typeof value !== 'string') return '';
  if (!layer.amountPart) return value;
  return splitAmountDisplay(value)[layer.amountPart] || '';
};

const measureSpacedText = (ctx, text, letterSpacing) =>
  [...text].reduce((width, character, index) => {
    const spacing = index > 0 ? letterSpacing : 0;
    return width + spacing + ctx.measureText(character).width;
  }, 0);

const fillSpacedText = (ctx, text, x, y, width, align, letterSpacing) => {
  if (!letterSpacing) {
    const drawX = align === 'right' ? x + width : align === 'center' ? x + width / 2 : x;
    ctx.fillText(text, drawX, y, width);
    return;
  }

  const textWidth = measureSpacedText(ctx, text, letterSpacing);
  let drawX = x;
  if (align === 'right') drawX = x + width - textWidth;
  else if (align === 'center') drawX = x + (width - textWidth) / 2;

  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((character, index) => {
    if (index > 0) drawX += letterSpacing;
    ctx.fillText(character, drawX, y);
    drawX += ctx.measureText(character).width;
  });
  ctx.textAlign = previousAlign;
};

const resolveAssetDataUrl = async (assetPath) => {
  if (!assetPath) return null;
  if (templateAssetDataUrlCache.has(assetPath)) return templateAssetDataUrlCache.get(assetPath);
  try {
    const response = await fetch(`templates/${assetPath}`, { cache: 'reload' });
    if (!response.ok) throw new Error(`No se pudo leer templates/${assetPath}`);
    const blob = await response.blob();
    if (!blob || !blob.size) throw new Error(`Asset vacío templates/${assetPath}`);
    const dataUrl = await blobToDataUrl(blob);
    if (!dataUrl) throw new Error(`No se pudo convertir asset templates/${assetPath}`);
    templateAssetDataUrlCache.set(assetPath, dataUrl);
    return dataUrl;
  } catch (error) {
    console.warn(error);
    return null;
  }
};

const updateTemplateControls = () => {
  const canDelete = isCustomTemplate(getFormData().templateId);
  saveTemplateButton.textContent = canDelete ? 'Actualizar plantilla' : 'Añadir plantilla';
  deleteTemplateButton.hidden = !canDelete;
};

const updatePreview = () => {
  const data = getFormData();
  const template = getTemplateFromForm();
  const activeTemplate = getSelectedTemplate();

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
  preview.classList.remove('template-background');
  preview.style.backgroundImage = '';
  if (templateOverlay) templateOverlay.innerHTML = '';

  selectedTemplateName.textContent = template.name;
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  updateTemplateControls();
  saveStatus.textContent = 'Guardado local';

  if (activeTemplate?.backgroundImage) {
    preview.classList.add('template-background');
    resolveAssetDataUrl(activeTemplate.backgroundImage).then((bgDataUrl) => {
      if (!bgDataUrl) {
        saveStatus.textContent = 'Error: fondo de plantilla no disponible';
        return;
      }
      preview.style.backgroundImage = `url("${bgDataUrl}")`;
    });

    const width = activeTemplate?.export?.width || 1010;
    const height = activeTemplate?.export?.height || 1600;
    const previewWidth = preview.clientWidth || 1;
    const previewScale = previewWidth / width;
    const fields = Array.isArray(activeTemplate.overlayFields) ? activeTemplate.overlayFields : [];
    fields.forEach((layer) => {
      const text = getOverlayText(layer, data);
      if (!text) return;
      const node = document.createElement('div');
      node.className = 'overlay-field';
      node.textContent = text;
      const scaleX = layer.scaleX || 1;
      node.style.left = `${layer.x * previewScale}px`;
      node.style.top = `${layer.y * previewScale}px`;
      node.style.width = `${(layer.width / scaleX) * previewScale}px`;
      node.style.height = `${(layer.height || layer.fontSize * 1.2) * previewScale}px`;
      node.style.fontSize = `${layer.fontSize * previewScale}px`;
      node.style.fontWeight = String(layer.fontWeight || 400);
      node.style.fontFamily = layer.fontFamily || activeTemplate.overlayFontFamily || DEFAULT_OVERLAY_FONT;
      node.style.lineHeight = String(layer.lineHeight || 1.1);
      node.style.letterSpacing = `${((layer.letterSpacing || 0) / scaleX) * previewScale}px`;
      if (scaleX !== 1) {
        node.style.transform = `scaleX(${scaleX})`;
        node.style.transformOrigin = 'left top';
      }
      node.style.color = layer.color || '#2f3b4b';
      node.style.textAlign = layer.align || 'left';
      if (templateOverlay) templateOverlay.append(node);
    });
  }
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
  renderTemplateOptions(systemTemplates[0].id);
  fillTemplateFields(systemTemplates[0]);
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
  const activeTemplate = getSelectedTemplate();
  const templateExportWidth = activeTemplate?.export?.width ?? EXPORT_SETTINGS.width;
  const templateExportHeight = activeTemplate?.export?.height ?? EXPORT_SETTINGS.height;
  const isBackgroundTemplate = Boolean(activeTemplate?.backgroundImage);

  if (isBackgroundTemplate) {
    const bgDataUrl = await resolveAssetDataUrl(activeTemplate.backgroundImage);
    if (!bgDataUrl) throw new Error('No se pudo cargar el fondo de la plantilla Banorte.');
    const directCanvas = document.createElement('canvas');
    directCanvas.width = templateExportWidth;
    directCanvas.height = templateExportHeight;
    const directCtx = directCanvas.getContext('2d');
    if (!directCtx) throw new Error('No se pudo preparar el render de Banorte.');

    const bgImage = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = bgDataUrl;
    });
    if (!bgImage) throw new Error('No se pudo decodificar el fondo de Banorte.');

    directCtx.drawImage(bgImage, 0, 0, templateExportWidth, templateExportHeight);

    const values = getFormData();
    const fields = Array.isArray(activeTemplate.overlayFields) ? activeTemplate.overlayFields : [];
    fields.forEach((layer) => {
      const text = getOverlayText(layer, values);
      if (!text) return;
      const fontWeight = layer.fontWeight || 400;
      const fontSize = layer.fontSize || 24;
      const fontFamily = layer.fontFamily || activeTemplate.overlayFontFamily || DEFAULT_OVERLAY_FONT;
      const color = layer.color || '#2f3b4b';
      const align = layer.align || 'left';
      const letterSpacing = layer.letterSpacing || 0;
      const scaleX = layer.scaleX || 1;
      const x = layer.x || 0;
      const y = layer.y || 0;
      const width = layer.width || templateExportWidth;
      const height = layer.height || Math.ceil(fontSize * 1.2);

      directCtx.fillStyle = color;
      directCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      directCtx.textAlign = align === 'right' ? 'right' : align === 'center' ? 'center' : 'left';
      directCtx.textBaseline = 'top';
      directCtx.save();
      directCtx.beginPath();
      directCtx.rect(x, y, width, height);
      directCtx.clip();
      if (scaleX === 1) {
        fillSpacedText(directCtx, text, x, y, width, align, letterSpacing);
      } else {
        directCtx.translate(x, y);
        directCtx.scale(scaleX, 1);
        fillSpacedText(directCtx, text, 0, 0, width / scaleX, align, letterSpacing / scaleX);
      }
      directCtx.restore();
    });

    return directCanvas.toDataURL(EXPORT_SETTINGS.format, EXPORT_SETTINGS.quality);
  }

  const renderScale = EXPORT_SETTINGS.scale;

  const sourceCanvas = await html2canvas(preview, {
    backgroundColor: previewBg,
    scale: renderScale,
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
      const clonedLogo = doc.querySelector('#receiptPreview img.bbva-logo');
      if (clonedLogo && logoDataUrl) clonedLogo.src = logoDataUrl;
    },
  });

  const targetWidth = templateExportWidth || sourceCanvas.width;
  const targetHeight = templateExportHeight || sourceCanvas.height;
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = targetWidth;
  outputCanvas.height = targetHeight;
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return sourceCanvas.toDataURL(EXPORT_SETTINGS.format, EXPORT_SETTINGS.quality);

  ctx.fillStyle = previewBg;
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  // iPhone/Safari-safe fallback: draw logo explicitly on top if available.
  if (img && logoDataUrl) {
    try {
      const previewRect = preview.getBoundingClientRect();
      const logoRect = img.getBoundingClientRect();
      if (previewRect.width > 0 && previewRect.height > 0 && logoRect.width > 0 && logoRect.height > 0) {
        const scaleX = targetWidth / previewRect.width;
        const scaleY = targetHeight / previewRect.height;
        const dx = (logoRect.left - previewRect.left) * scaleX;
        const dy = (logoRect.top - previewRect.top) * scaleY;
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
    link.download = 'comprobante.png';
    link.click();
  } catch (error) {
    console.error(error);
    alert(error?.message || 'No se pudo exportar la imagen. Intenta de nuevo.');
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
  footerText: template.footerText || systemTemplates[0]?.footerText || fallbackTemplates[0].footerText,
});

const normalizeSystemTemplate = (template) => ({
  id: template.id || `default-${Date.now()}`,
  name: template.name || 'Plantilla',
  type: template.type || 'default',
  bankBrand: template.bankBrand || 'BBVA',
  operationHeading: template.operationHeading || 'COMPROBANTE DE LA OPERACION',
  footerText: template.footerText || fallbackTemplates[0].footerText,
  backgroundImage: template.backgroundImage || null,
  overlayFontFamily: template.overlayFontFamily || DEFAULT_OVERLAY_FONT,
  export: {
    width: template?.export?.width || null,
    height: template?.export?.height || null,
  },
  overlayFields: Array.isArray(template.overlayFields) ? template.overlayFields : [],
});

const loadSystemTemplatesFromFiles = async () => {
  try {
    const indexResponse = await fetch('templates/index.json', { cache: 'no-store' });
    if (!indexResponse.ok) throw new Error('No se pudo leer templates/index.json');
    const indexPayload = await indexResponse.json();
    const entries = Array.isArray(indexPayload.templates) ? indexPayload.templates : [];
    if (!entries.length) throw new Error('templates/index.json no tiene plantillas');

    const loaded = await Promise.all(
      entries.map(async (entry) => {
        const response = await fetch(`templates/${entry.path}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`No se pudo leer templates/${entry.path}`);
        const payload = await response.json();
        return normalizeSystemTemplate({ ...payload, id: payload.id || entry.id, name: payload.name || entry.name });
      }),
    );

    systemTemplates = loaded.length ? loaded : [...fallbackTemplates];
  } catch (error) {
    console.warn('Fallo carga de plantillas desde archivos, usando fallback:', error);
    systemTemplates = [...fallbackTemplates];
  }
};

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
    renderTemplateOptions(incoming.at(-1)?.id || systemTemplates[0].id);
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

const initialize = async () => {
  await loadSystemTemplatesFromFiles();
  customTemplates = JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY) || '[]').map(normalizeTemplate);
  renderTemplateOptions();
  const savedDraft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
  const initialData = savedDraft || sampleReceipt;
  const template = getTemplateById(initialData.templateId);
  fillTemplateFields(template);
  setFormData({ ...initialData, templateId: template.id });
  updatePreview();
  ensureLogoAvailable();
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



