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
const appVersion = document.querySelector('#appVersion');

const DRAFT_STORAGE_KEY = 'comprobantes.bbvaDraft.v1';
const TEMPLATE_STORAGE_KEY = 'comprobantes.bbvaTemplates.v1';
const CUSTOM_TEMPLATE_PREFIX = 'custom-';
const APP_VERSION = 'v1.0.1-md:d,c';

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
  format: 'image/jpeg',
  quality: 0.92,
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

const drawTextLayer = (ctx, text, x, y, width, align) => {
  const drawX = align === 'right' ? x + width : align === 'center' ? x + width / 2 : x;
  ctx.fillText(text, drawX, y, width);
};

const getAmountLayout = (layer, value) => {
  const parts = splitAmountDisplay(value);
  const currency = parts.currency || '$';
  const suffix = parts.suffix || 'MN';
  return {
    currency,
    amount: parts.amount,
    suffix,
    currencySize: layer.currencyFontSize || 51,
    amountSize: layer.amountFontSize || 78,
    suffixSize: layer.suffixFontSize || 52,
    currencyWeight: layer.currencyFontWeight || 400,
    amountWeight: layer.amountFontWeight || 400,
    suffixWeight: layer.suffixFontWeight || 400,
    commaText: layer.commaText || ',',
    commaFontFamily: layer.commaFontFamily || null,
    commaSize: layer.commaFontSize || layer.amountFontSize || 78,
    commaWeight: layer.commaFontWeight || 400,
    commaOffsetY: layer.commaOffsetY || layer.amountOffsetY || 0,
    commaGapBefore: layer.commaGapBefore || 0,
    commaGapAfter: layer.commaGapAfter || 0,
    currencyOffsetY: layer.currencyOffsetY || 20,
    amountOffsetY: layer.amountOffsetY || 0,
    suffixOffsetY: layer.suffixOffsetY || 23,
    currencyGap: layer.currencyGap || 18,
    suffixGap: layer.suffixGap || 28,
  };
};

const getAmountTokens = (amount) => {
  const tokens = [];
  let digitBuffer = '';
  [...amount].forEach((character) => {
    if (character === ',') {
      if (digitBuffer) tokens.push({ type: 'text', value: digitBuffer });
      tokens.push({ type: 'comma', value: character });
      digitBuffer = '';
      return;
    }
    digitBuffer += character;
  });
  if (digitBuffer) tokens.push({ type: 'text', value: digitBuffer });
  return tokens;
};

const measureAmountPart = (ctx, fontFamily, weight, size, text) => {
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  return ctx.measureText(text).width;
};

const measureAmountValue = (ctx, fontFamily, amountLayout, scale) =>
  getAmountTokens(amountLayout.amount).reduce((width, token) => {
    if (token.type === 'comma') {
      const commaFontFamily = amountLayout.commaFontFamily || fontFamily;
      return (
        width +
        amountLayout.commaGapBefore * scale +
        measureAmountPart(ctx, commaFontFamily, amountLayout.commaWeight, amountLayout.commaSize * scale, amountLayout.commaText) +
        amountLayout.commaGapAfter * scale
      );
    }
    return width + measureAmountPart(ctx, fontFamily, amountLayout.amountWeight, amountLayout.amountSize * scale, token.value);
  }, 0);

const fitAmountLayout = (ctx, fontFamily, amountLayout, maxWidth) => {
  const measureAtScale = (scale) => {
    const currencyWidth = measureAmountPart(
      ctx,
      fontFamily,
      amountLayout.currencyWeight,
      amountLayout.currencySize * scale,
      amountLayout.currency,
    );
    const amountWidth = measureAmountValue(ctx, fontFamily, amountLayout, scale);
    const suffixWidth = measureAmountPart(
      ctx,
      fontFamily,
      amountLayout.suffixWeight,
      amountLayout.suffixSize * scale,
      amountLayout.suffix,
    );
    return {
      currencyWidth,
      amountWidth,
      suffixWidth,
      totalWidth:
        currencyWidth +
        amountLayout.currencyGap * scale +
        amountWidth +
        amountLayout.suffixGap * scale +
        suffixWidth,
    };
  };

  const fullSize = measureAtScale(1);
  const scale = fullSize.totalWidth > maxWidth ? Math.max(maxWidth / fullSize.totalWidth, 0.72) : 1;
  return { ...measureAtScale(scale), scale };
};

const getAmountTokenPositions = (ctx, fontFamily, amountLayout, scale, amountLeft) => {
  let currentX = amountLeft;
  return getAmountTokens(amountLayout.amount).map((token) => {
    if (token.type === 'comma') {
      const commaFontFamily = amountLayout.commaFontFamily || fontFamily;
      currentX += amountLayout.commaGapBefore * scale;
      const width = measureAmountPart(ctx, commaFontFamily, amountLayout.commaWeight, amountLayout.commaSize * scale, amountLayout.commaText);
      const positionedToken = { ...token, value: amountLayout.commaText, fontFamily: commaFontFamily, x: currentX, width };
      currentX += width + amountLayout.commaGapAfter * scale;
      return positionedToken;
    }
    const width = measureAmountPart(ctx, fontFamily, amountLayout.amountWeight, amountLayout.amountSize * scale, token.value);
    const positionedToken = { ...token, x: currentX, width };
    currentX += width;
    return positionedToken;
  });
};

const renderAmountOverlayNode = (layer, value, activeTemplate, previewScale) => {
  const node = document.createElement('div');
  const amountLayout = getAmountLayout(layer, value);
  const fontFamily = layer.fontFamily || activeTemplate.overlayFontFamily || DEFAULT_OVERLAY_FONT;
  const maxWidth = layer.width || 540;
  const measureCanvas = document.createElement('canvas');
  const measureCtx = measureCanvas.getContext('2d');
  const fitted = measureCtx
    ? fitAmountLayout(measureCtx, fontFamily, amountLayout, maxWidth)
    : { scale: 1, currencyWidth: 0, amountWidth: 0, suffixWidth: 0, totalWidth: maxWidth };
  const startX = layer.align === 'center' ? (maxWidth - fitted.totalWidth) / 2 : 0;

  node.className = 'overlay-field amount-overlay';
  node.style.left = `${layer.x * previewScale}px`;
  node.style.top = `${layer.y * previewScale}px`;
  node.style.width = `${maxWidth * previewScale}px`;
  node.style.height = `${(layer.height || 90) * previewScale}px`;
  node.style.color = layer.color || '#3D474E';
  node.style.fontFamily = fontFamily;

  const createPart = (text, left, top, size, weight, partFontFamily = fontFamily) => {
    const part = document.createElement('span');
    part.textContent = text;
    part.style.position = 'absolute';
    part.style.left = `${left * previewScale}px`;
    part.style.top = `${top * previewScale}px`;
    part.style.fontSize = `${size * fitted.scale * previewScale}px`;
    part.style.fontWeight = String(weight);
    part.style.fontFamily = partFontFamily;
    part.style.lineHeight = '1';
    node.append(part);
  };

  const currencyLeft = startX;
  const amountLeft = currencyLeft + fitted.currencyWidth + amountLayout.currencyGap * fitted.scale;
  const suffixLeft = amountLeft + fitted.amountWidth + amountLayout.suffixGap * fitted.scale;
  const amountTokens = measureCtx ? getAmountTokenPositions(measureCtx, fontFamily, amountLayout, fitted.scale, amountLeft) : [];
  createPart(
    amountLayout.currency,
    currencyLeft,
    amountLayout.currencyOffsetY * fitted.scale,
    amountLayout.currencySize,
    amountLayout.currencyWeight,
  );
  amountTokens.forEach((token) => {
    createPart(
      token.value,
      token.x,
      (token.type === 'comma' ? amountLayout.commaOffsetY : amountLayout.amountOffsetY) * fitted.scale,
      token.type === 'comma' ? amountLayout.commaSize : amountLayout.amountSize,
      token.type === 'comma' ? amountLayout.commaWeight : amountLayout.amountWeight,
      token.fontFamily || fontFamily,
    );
  });
  createPart(
    amountLayout.suffix,
    suffixLeft,
    amountLayout.suffixOffsetY * fitted.scale,
    amountLayout.suffixSize,
    amountLayout.suffixWeight,
  );
  return node;
};

const drawAmountOverlay = (ctx, layer, value, fontFamily, color) => {
  const amountLayout = getAmountLayout(layer, value);
  const maxWidth = layer.width || 540;
  const fitted = fitAmountLayout(ctx, fontFamily, amountLayout, maxWidth);
  const startX = layer.x + (layer.align === 'center' ? (maxWidth - fitted.totalWidth) / 2 : 0);
  const currencyX = startX;
  const amountX = currencyX + fitted.currencyWidth + amountLayout.currencyGap * fitted.scale;
  const suffixX = amountX + fitted.amountWidth + amountLayout.suffixGap * fitted.scale;
  const amountTokens = getAmountTokenPositions(ctx, fontFamily, amountLayout, fitted.scale, amountX);

  const drawPart = (text, x, offsetY, size, weight, partFontFamily = fontFamily) => {
    ctx.font = `${weight} ${size * fitted.scale}px ${partFontFamily}`;
    ctx.fillText(text, x, layer.y + offsetY * fitted.scale);
  };

  ctx.fillStyle = color || '#3D474E';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  drawPart(
    amountLayout.currency,
    currencyX,
    amountLayout.currencyOffsetY,
    amountLayout.currencySize,
    amountLayout.currencyWeight,
  );
  amountTokens.forEach((token) => {
    drawPart(
      token.value,
      token.x,
      token.type === 'comma' ? amountLayout.commaOffsetY : amountLayout.amountOffsetY,
      token.type === 'comma' ? amountLayout.commaSize : amountLayout.amountSize,
      token.type === 'comma' ? amountLayout.commaWeight : amountLayout.amountWeight,
      token.fontFamily || fontFamily,
    );
  });
  drawPart(
    amountLayout.suffix,
    suffixX,
    amountLayout.suffixOffsetY,
    amountLayout.suffixSize,
    amountLayout.suffixWeight,
  );
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
      if (layer.amountLayout) {
        const value = data[layer.field];
        if (typeof value !== 'string' || !value.trim()) return;
        if (templateOverlay) templateOverlay.append(renderAmountOverlayNode(layer, value, activeTemplate, previewScale));
        return;
      }
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
      if (layer.amountLayout) {
        const value = values[layer.field];
        if (typeof value !== 'string' || !value.trim()) return;
        directCtx.save();
        directCtx.beginPath();
        directCtx.rect(layer.x || 0, layer.y || 0, layer.width || templateExportWidth, layer.height || 100);
        directCtx.clip();
        drawAmountOverlay(
          directCtx,
          layer,
          value,
          layer.fontFamily || activeTemplate.overlayFontFamily || DEFAULT_OVERLAY_FONT,
          layer.color,
        );
        directCtx.restore();
        return;
      }
      const text = getOverlayText(layer, values);
      if (!text) return;
      const fontWeight = layer.fontWeight || 400;
      const fontSize = layer.fontSize || 24;
      const fontFamily = layer.fontFamily || activeTemplate.overlayFontFamily || DEFAULT_OVERLAY_FONT;
      const color = layer.color || '#2f3b4b';
      const align = layer.align || 'left';
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
        drawTextLayer(directCtx, text, x, y, width, align);
      } else {
        directCtx.translate(x, y);
        directCtx.scale(scaleX, 1);
        drawTextLayer(directCtx, text, 0, 0, width / scaleX, align);
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
    link.download = 'comprobante.jpg';
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
  if (appVersion) appVersion.textContent = APP_VERSION;
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
