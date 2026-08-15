import {
  DEFAULT_OVERLAY_FONT,
  ensureTemplateFontsAvailable as ensureRendererFontsAvailable,
  fitAmountLayout,
  getAmountLayout,
  getAmountTokenPositions,
  renderTemplateToCanvas,
  splitAmountDisplay,
} from './template-renderer.js';
import { formatMoneyValue } from './money-format.js';

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
const templatePreviewCanvas = document.querySelector('#templatePreviewCanvas');
const appVersion = document.querySelector('#appVersion');
const templateHelp = document.querySelector('#templateHelp');
const dataGroups = document.querySelectorAll('[data-field-group]');
const userProfileSelect = document.querySelector('#userProfileSelect');

const DRAFT_STORAGE_KEY = 'comprobantes.receiptDraft.v2';
const TEMPLATE_STORAGE_KEY = 'comprobantes.bbvaTemplates.v1';
const SYSTEM_TEMPLATE_OVERRIDE_KEY = 'comprobantes.systemTemplateOverrides.v1';
const USER_DEFAULTS_STORAGE_KEY = 'comprobantes.userDefaults.v1';
const SELECTED_USER_STORAGE_KEY = 'comprobantes.selectedUser.v1';
const CUSTOM_TEMPLATE_PREFIX = 'custom-';
const APP_VERSION = 'v1.4.0';
const MONEY_FIELD_FORMATS = {
  amountText: { prefix: '$ ', suffix: '' },
  amountDisplay: { prefix: '$ ', suffix: ' MN' },
  detailAmount: { prefix: '$ ', suffix: ' MN' },
  detailCommission: { prefix: '$', suffix: ' MN' },
  detailTax: { prefix: '$', suffix: ' MN' },
  detail2Amount: { prefix: '$ ', suffix: ' MN' },
  detail2Commission: { prefix: '$ ', suffix: ' MN' },
  detail2Tax: { prefix: '$ ', suffix: ' MN' },
};

const fallbackTemplates = [
  {
    id: 'bbva',
    name: 'BBVA compartir',
    bankBrand: 'BBVA',
    operationHeading: 'COMPROBANTE DE LA OPERACION',
    footerText:
      'BBVA México, S.A., Institución de Banca Múltiple, Grupo Financiero BBVA México. Avenida Paseo de la Reforma 510, colonia Juárez, código postal 06600, alcaldía Cuauhtémoc, Ciudad de México.',
  },
];

const sampleReceipt = {
  templateId: 'bbva',
  templateName: 'BBVA compartir',
  bankBrand: 'BBVA',
  operationHeading: 'COMPROBANTE DE LA OPERACION',
  operationType: 'Transferencia a otros bancos',
  folio: '0000000000',
  dateText: '1 enero 2026',
  timeText: '12:00 h',
  concept: 'Pago',
  trackingKey: 'CLAVE00000000000000000000000',
  amountText: '$ 100.00',
  sourceAccount: '•0000',
  beneficiaryName: 'NOMBRE DEL BENEFICIARIO',
  bankName: 'BANCO DESTINO',
  destinationAccount: '•0000',
  verificationUrl: 'https://www.banxico.org.mx/cep/',
  clarificationUrl: 'www.bbva.mx',
  amountDisplay: '$ 1,000.00 MN',
  destinatarioNombre: 'NOMBRE DEL DESTINATARIO',
  destinatarioBanco: 'BANCO DESTINO',
  sourceAccountSuffix: '0000',
  destinationCardSuffix: '0000',
  conceptoTransferencia: 'PAGO',
  aliasDestinatario: 'DESTINATARIO',
  operationDateTime: '01-01-2026 - 12:00:00',
  detailAmount: '$ 100.00 MN',
  detailDateTime: '01-01-2026 - 12:00:00',
  detailDestinationAccount: 'Tarjeta ****0000',
  detailDestinationBank: 'BANCO DESTINO',
  detailSourceAccount: 'CUENTA DE ORIGEN\n****0000',
  detailSender: 'NOMBRE DEL ORDENANTE',
  detailSenderRfc: 'XAXX010101000',
  detailCommission: '$0.00 MN',
  detailTax: '$0.00 MN',
  detailConcept: 'Pago',
  detailReference: '000000',
  detailOperationType: 'Transferencia única',
  detailTrackingKey: 'CLAVE00000000000000000000000',
  footerText:
    'BBVA México, S.A., Institución de Banca Múltiple, Grupo Financiero BBVA México. Avenida Paseo de la Reforma 510, colonia Juárez, código postal 06600, alcaldía Cuauhtémoc, Ciudad de México.',
};

let customTemplates = [];
let systemTemplates = [...fallbackTemplates];
let activeUserProfile = 'usuario-1';
const LOGO_PRIMARY_SRC = 'bbva-logo.png';
const LOGO_FALLBACK_SRC = 'bbva-logo.svg';
let resolvedLogoDataUrl = null;
const templateAssetDataUrlCache = new Map();
const decodedTemplateImageCache = new Map();
let backgroundPreviewRenderId = 0;
let readyPreviewBackgroundImage = null;
let readyPreviewBackgroundKey = '';
const EXPORT_SETTINGS = {
  format: 'image/jpeg',
  quality: 0.92,
  scale: 3,
  // Set width/height in px (e.g. 512/1536) to force exact output size.
  // Keep null to use the preview's natural rendered size.
  width: 485,
  height: 1600,
};
const ensureTemplateFontsAvailable = (template) => ensureRendererFontsAvailable(template);
const USER_DEFAULT_FIELD_NAMES = [
  'operationType',
  'concept',
  'sourceAccount',
  'beneficiaryName',
  'bankName',
  'destinationAccount',
  'destinatarioNombre',
  'destinatarioBanco',
  'sourceAccountSuffix',
  'destinationCardSuffix',
  'conceptoTransferencia',
  'aliasDestinatario',
  'detailDestinationAccount',
  'detailDestinationBank',
  'detailSourceAccount',
  'detailSender',
  'detailSenderRfc',
  'detailCommission',
  'detailTax',
  'detailConcept',
  'detailOperationType',
  'detail2DestinationAccount',
  'detail2DestinationBank',
  'detail2SourceAccount',
  'detail2Sender',
  'detail2SenderRfc',
  'detail2Commission',
  'detail2Tax',
  'detail2Concept',
  'detail2OperationType',
  'detail2RecipientEmail',
];

const getFormData = () => Object.fromEntries(new FormData(form).entries());
const getTemplates = () => [...systemTemplates, ...customTemplates];
const getTemplateById = (templateId) => getTemplates().find((t) => t.id === templateId) || systemTemplates[0];
const isCustomTemplate = (templateId) => templateId?.startsWith(CUSTOM_TEMPLATE_PREFIX);
const persistCustomTemplates = () => localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(customTemplates));
const cloneTemplate = (template) => JSON.parse(JSON.stringify(template || {}));

const getMoneyCaretIntent = (value, caretPosition) => {
  const text = String(value ?? '');
  const caret = Number.isInteger(caretPosition) ? caretPosition : text.length;
  const dotIndex = text.indexOf('.');
  const beforeCaret = text.slice(0, caret);

  if (dotIndex >= 0 && caret > dotIndex) {
    return {
      part: 'decimal',
      digitCount: beforeCaret.slice(dotIndex + 1).replace(/\D/g, '').length,
    };
  }

  return { part: 'integer', digitCount: beforeCaret.replace(/\D/g, '').length };
};

const getMoneyCaretPosition = (value, format, intent) => {
  const integerStart = format.prefix.length;
  const dotIndex = value.indexOf('.', integerStart);
  if (intent.part === 'decimal' && dotIndex >= 0) {
    return Math.min(dotIndex + 1 + intent.digitCount, dotIndex + 3);
  }

  const integerEnd = dotIndex >= 0 ? dotIndex : value.length - format.suffix.length;
  if (intent.digitCount <= 0) return integerStart;
  let digitsSeen = 0;
  for (let index = integerStart; index < integerEnd; index += 1) {
    if (/\d/.test(value[index])) digitsSeen += 1;
    if (digitsSeen === intent.digitCount) return index + 1;
  }
  return integerEnd;
};

const formatMoneyInput = (input, { selectDecimals = false } = {}) => {
  const format = MONEY_FIELD_FORMATS[input?.name];
  if (!input || !format) return;

  const intent = getMoneyCaretIntent(input.value, input.selectionStart);
  const formattedValue = formatMoneyValue(input.value, { ...format, forceDecimals: true });
  if (input.value !== formattedValue) input.value = formattedValue;

  if (document.activeElement !== input || typeof input.setSelectionRange !== 'function') return;
  const dotIndex = formattedValue.indexOf('.');
  if (selectDecimals && dotIndex >= 0) {
    input.setSelectionRange(dotIndex + 1, dotIndex + 3);
    return;
  }
  const caret = getMoneyCaretPosition(formattedValue, format, intent);
  input.setSelectionRange(caret, caret);
};

const formatAllMoneyInputs = () => {
  Object.keys(MONEY_FIELD_FORMATS).forEach((fieldName) => formatMoneyInput(form.elements[fieldName]));
};

const initializeMoneyInputs = () => {
  Object.keys(MONEY_FIELD_FORMATS).forEach((fieldName) => {
    const input = form.elements[fieldName];
    if (!input) return;
    input.addEventListener('keydown', (event) => {
      if (event.key !== '.' && event.key !== 'Decimal') return;
      event.preventDefault();
      formatMoneyInput(input, { selectDecimals: true });
    });
    input.addEventListener('beforeinput', (event) => {
      if (event.inputType !== 'insertText' || event.data !== '.') return;
      event.preventDefault();
      formatMoneyInput(input, { selectDecimals: true });
    });
    input.addEventListener('input', () => formatMoneyInput(input));
    input.addEventListener('blur', () => formatMoneyInput(input));
  });
};

const setFormData = (data) => {
  Object.entries(data).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
};

const padDatePart = (value) => String(value).padStart(2, '0');

const getCurrentDateTimeValues = (date = new Date()) => {
  const day = padDatePart(date.getDate());
  const month = date.toLocaleDateString('es-MX', { month: 'long' });
  const year = date.getFullYear();
  const hours = padDatePart(date.getHours());
  const minutes = padDatePart(date.getMinutes());
  const seconds = padDatePart(date.getSeconds());

  return {
    dateText: `${Number(day)} ${month} ${year}`,
    timeText: `${hours}:${minutes} h`,
    operationDateTime: `${day}-${padDatePart(date.getMonth() + 1)}-${year} - ${hours}:${minutes}:${seconds}`,
    detailDateTime: `${day}-${padDatePart(date.getMonth() + 1)}-${year} - ${hours}:${minutes}:${seconds}`,
    detail2DateTime: `${day}/${padDatePart(date.getMonth() + 1)}/${year} - ${hours}:${minutes}`,
  };
};

const applyCurrentDateTime = ({ render = false } = {}) => {
  setFormData(getCurrentDateTimeValues());
  if (render) updatePreview();
};

const getStoredUserDefaults = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_DEFAULTS_STORAGE_KEY) || '{}') || {};
  } catch {
    return {};
  }
};

const saveUserDefaultsFromForm = (userId = activeUserProfile) => {
  if (!userId) return;
  const data = getFormData();
  const defaults = {};
  USER_DEFAULT_FIELD_NAMES.forEach((fieldName) => {
    if (typeof data[fieldName] === 'string') defaults[fieldName] = data[fieldName];
  });
  const stored = getStoredUserDefaults();
  stored[userId] = defaults;
  localStorage.setItem(USER_DEFAULTS_STORAGE_KEY, JSON.stringify(stored));
};

const applyUserDefaults = (userId = activeUserProfile) => {
  const defaults = getStoredUserDefaults()[userId];
  if (defaults) setFormData(defaults);
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

const getOverlayText = (layer, values) => {
  const value = values[layer.field];
  if (typeof value !== 'string') return '';
  if (!layer.amountPart) return value;
  return splitAmountDisplay(value)[layer.amountPart] || '';
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
  node.style.backgroundColor = layer.backgroundColor || 'transparent';
  node.style.fontFamily = fontFamily;

  const createPart = (text, left, top, size, weight, partFontFamily = fontFamily, horizontalScale = 1) => {
    const part = document.createElement('span');
    part.textContent = text;
    part.style.position = 'absolute';
    part.style.left = `${left * previewScale}px`;
    part.style.top = `${top * previewScale}px`;
    part.style.fontSize = `${size * fitted.scale * previewScale}px`;
    part.style.fontWeight = String(weight);
    part.style.fontFamily = partFontFamily;
    part.style.lineHeight = '1';
    if (horizontalScale !== 1) {
      part.style.transform = `scaleX(${horizontalScale})`;
      part.style.transformOrigin = 'left top';
    }
    node.append(part);
  };

  const currencyLeft = startX;
  const amountLeft = currencyLeft + fitted.currencyWidth + amountLayout.currencyGap * fitted.scale;
  const suffixLeft = amountLeft + fitted.amountWidth + amountLayout.suffixGap * fitted.scale;
  const amountTokens = measureCtx ? getAmountTokenPositions(measureCtx, fontFamily, amountLayout, fitted.scale, amountLeft) : [];
  createPart(
    amountLayout.currency,
    currencyLeft + amountLayout.currencyOffsetX,
    amountLayout.currencyOffsetY * fitted.scale,
    amountLayout.currencySize,
    amountLayout.currencyWeight,
    fontFamily,
    amountLayout.currencyScaleX,
  );
  amountTokens.forEach((token) => {
    createPart(
      token.value,
      token.x,
      (token.type === 'comma' ? amountLayout.commaOffsetY : amountLayout.amountOffsetY) * fitted.scale,
      token.type === 'comma' ? amountLayout.commaSize : amountLayout.amountSize,
      token.type === 'comma' ? amountLayout.commaWeight : amountLayout.amountWeight,
      token.fontFamily || fontFamily,
      token.type === 'comma' ? 1 : amountLayout.amountScaleX,
    );
  });
  createPart(
    amountLayout.suffix,
    suffixLeft + amountLayout.suffixOffsetX,
    amountLayout.suffixOffsetY * fitted.scale,
    amountLayout.suffixSize,
    amountLayout.suffixWeight,
    fontFamily,
    amountLayout.suffixScaleX,
  );
  return node;
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

const decodeTemplateImage = (source) => {
  if (!source) return Promise.resolve(null);
  if (decodedTemplateImageCache.has(source)) return decodedTemplateImageCache.get(source);

  const imagePromise = new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = source;
  });
  decodedTemplateImageCache.set(source, imagePromise);
  return imagePromise;
};

const updateTemplateControls = () => {
  const canDelete = isCustomTemplate(getFormData().templateId);
  saveTemplateButton.textContent = canDelete ? 'Actualizar plantilla' : 'Añadir plantilla';
  deleteTemplateButton.hidden = !canDelete;
};

const updatePreview = () => {
  const previewRenderId = ++backgroundPreviewRenderId;
  formatAllMoneyInputs();
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
  preview.classList.remove('template-background', 'canvas-preview-ready');
  preview.style.backgroundImage = '';
  preview.style.aspectRatio = '';
  if (templateOverlay) templateOverlay.innerHTML = '';

  selectedTemplateName.textContent = activeTemplate?.name || template.name;
  const usesBackground = Boolean(activeTemplate?.backgroundImage || activeTemplate?.backgroundImageDataUrl);
  const activeFormGroup = activeTemplate?.formGroup || (usesBackground ? 'banorte-summary' : 'bbva');
  dataGroups.forEach((group) => {
    group.hidden = group.dataset.fieldGroup !== activeFormGroup;
  });
  if (templateHelp) {
    const fieldCount = Array.isArray(activeTemplate?.overlayFields) ? activeTemplate.overlayFields.length : 0;
    templateHelp.textContent = usesBackground
      ? `Plantilla sobre imagen · ${fieldCount} campos posicionados. Puedes corregirlos en el diseñador avanzado.`
      : 'Diseño detallado con secciones amplias y texto legal.';
  }
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(data));
  updateTemplateControls();
  saveStatus.textContent = 'Guardado local';

  if (usesBackground) {
    preview.classList.add('template-background');
    const backgroundKey = `${activeTemplate.id}|${
      activeTemplate.backgroundImageDataUrl || activeTemplate.backgroundImage || ''
    }`;
    if (readyPreviewBackgroundKey !== backgroundKey) {
      readyPreviewBackgroundImage = null;
      readyPreviewBackgroundKey = '';
    }
    Promise.resolve(
      activeTemplate.backgroundImageDataUrl || resolveAssetDataUrl(activeTemplate.backgroundImage),
    ).then(async (bgDataUrl) => {
      if (previewRenderId !== backgroundPreviewRenderId) return;
      if (!bgDataUrl) {
        saveStatus.textContent = 'Error: fondo de plantilla no disponible';
        return;
      }
      preview.style.backgroundImage = `url("${bgDataUrl}")`;

      if (!templatePreviewCanvas) return;
      const backgroundImage = await decodeTemplateImage(bgDataUrl);
      if (!backgroundImage || previewRenderId !== backgroundPreviewRenderId) return;

      renderTemplateToCanvas({
        canvas: templatePreviewCanvas,
        template: activeTemplate,
        values: data,
        backgroundImage,
      });
      if (previewRenderId === backgroundPreviewRenderId) {
        readyPreviewBackgroundImage = backgroundImage;
        readyPreviewBackgroundKey = backgroundKey;
        preview.classList.add('canvas-preview-ready');
      }
    }).catch((error) => {
      console.warn('No se pudo renderizar la vista previa exacta:', error);
    });

    const width = activeTemplate?.export?.width || 1010;
    const height = activeTemplate?.export?.height || 1600;
    preview.style.aspectRatio = `${width} / ${height}`;
    const previewWidth = preview.clientWidth || 1;
    const previewScale = previewWidth / width;
    const fields = Array.isArray(activeTemplate.overlayFields) ? activeTemplate.overlayFields : [];
    fields.forEach((layer) => {
      if (layer.amountLayout) {
        const value = data[layer.field];
        if (typeof value !== 'string' || !value.trim()) return;
        if (templateOverlay) {
          const node = renderAmountOverlayNode(layer, value, activeTemplate, previewScale);
          templateOverlay.append(node);
        }
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
      node.style.whiteSpace = layer.multiline ? 'pre-wrap' : 'nowrap';
      if (scaleX !== 1) {
        node.style.transform = `scaleX(${scaleX})`;
        node.style.transformOrigin = 'left top';
      }
      node.style.color = layer.color || '#2f3b4b';
      node.style.backgroundColor = layer.backgroundColor || 'transparent';
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

const handleTemplateChange = async () => {
  const template = getTemplateById(templateSelect.value);
  fillTemplateFields(template);
  if (template.defaultValues) {
    setFormData({ ...template.defaultValues, templateId: template.id });
  }
  applyUserDefaults();
  applyCurrentDateTime();
  await ensureTemplateFontsAvailable(template);
  updatePreview();
};

const saveCustomTemplate = () => {
  const formTemplate = getTemplateFromForm();
  const templateId = isCustomTemplate(formTemplate.id) ? formTemplate.id : `${CUSTOM_TEMPLATE_PREFIX}${Date.now()}`;
  const activeTemplate = cloneTemplate(getSelectedTemplate());
  const customTemplate = { ...activeTemplate, ...formTemplate, id: templateId };
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
  const activeTemplate = getSelectedTemplate();
  await ensureTemplateFontsAvailable(activeTemplate);
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
  const templateExportWidth = activeTemplate?.export?.width ?? EXPORT_SETTINGS.width;
  const templateExportHeight = activeTemplate?.export?.height ?? EXPORT_SETTINGS.height;
  const isBackgroundTemplate = Boolean(activeTemplate?.backgroundImage || activeTemplate?.backgroundImageDataUrl);

  if (isBackgroundTemplate) {
    const bgDataUrl =
      activeTemplate.backgroundImageDataUrl || (await resolveAssetDataUrl(activeTemplate.backgroundImage));
    if (!bgDataUrl) throw new Error('No se pudo cargar el fondo de la plantilla Banorte.');
    const directCanvas = document.createElement('canvas');

    const bgImage = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => resolve(null);
      image.src = bgDataUrl;
    });
    if (!bgImage) throw new Error('No se pudo decodificar el fondo de Banorte.');

    renderTemplateToCanvas({
      canvas: directCanvas,
      template: {
        ...activeTemplate,
        export: {
          width: templateExportWidth,
          height: templateExportHeight,
        },
      },
      values: getFormData(),
      backgroundImage: bgImage,
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

const getReadyPreviewImageDataUrl = () => {
  const activeTemplate = getSelectedTemplate();
  const usesBackground = Boolean(activeTemplate?.backgroundImage || activeTemplate?.backgroundImageDataUrl);
  if (!usesBackground || !templatePreviewCanvas?.width || !templatePreviewCanvas?.height) {
    return null;
  }

  const backgroundKey = `${activeTemplate.id}|${
    activeTemplate.backgroundImageDataUrl || activeTemplate.backgroundImage || ''
  }`;
  if (readyPreviewBackgroundImage && readyPreviewBackgroundKey === backgroundKey) {
    // Read and draw the form again inside the download gesture. On iPhone the
    // decimal key can finish updating the input immediately before the tap.
    renderTemplateToCanvas({
      canvas: templatePreviewCanvas,
      template: activeTemplate,
      values: getFormData(),
      backgroundImage: readyPreviewBackgroundImage,
    });
    preview.classList.add('canvas-preview-ready');
  } else if (!preview.classList.contains('canvas-preview-ready')) {
    return null;
  }

  return templatePreviewCanvas.toDataURL(EXPORT_SETTINGS.format, EXPORT_SETTINGS.quality);
};

const dataUrlToBlob = (dataUrl) => {
  const [header, encodedData = ''] = String(dataUrl).split(',');
  const mimeType = header.match(/^data:([^;,]+)/)?.[1] || 'image/jpeg';
  const binary = atob(encodedData);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType });
};

const isAppleMobileBrowser = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const saveReceiptFile = async (dataUrl) => {
  const filename = 'comprobante.jpg';
  const blob = dataUrlToBlob(dataUrl);
  const isAppleMobile = isAppleMobileBrowser();

  if (isAppleMobile && typeof File === 'function' && navigator.share && navigator.canShare) {
    const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Comprobante' });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
        console.warn('No se pudo abrir el guardado nativo de iPhone:', error);
      }
    }
  }

  const objectUrl = isAppleMobile ? null : URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl || dataUrl;
  link.download = filename;
  link.rel = 'noopener';
  if (isAppleMobile) link.target = '_blank';
  link.style.position = 'fixed';
  link.style.left = '-9999px';
  link.style.opacity = '0';
  document.body.append(link);
  link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));

  window.setTimeout(() => {
    link.remove();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }, 1500);
};

const downloadReceipt = async () => {
  try {
    const dataUrl = getReadyPreviewImageDataUrl() || (await captureReceiptImage());
    await saveReceiptFile(dataUrl);
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
  revision: Number.isFinite(Number(template.revision)) ? Number(template.revision) : 0,
  defaultValuesRevision: Number.isFinite(Number(template.defaultValuesRevision))
    ? Number(template.defaultValuesRevision)
    : 0,
  name: template.name || 'Plantilla importada',
  type: template.type || 'custom',
  bankBrand: template.bankBrand || 'BBVA',
  operationHeading: template.operationHeading || 'COMPROBANTE DE LA OPERACION',
  footerText: template.footerText || systemTemplates[0]?.footerText || fallbackTemplates[0].footerText,
  layout: template.layout || 'standard',
  style: template.style || {},
  formGroup: template.formGroup || null,
  defaultValues: template.defaultValues || null,
  backgroundImage: template.backgroundImage || null,
  backgroundImageDataUrl: template.backgroundImageDataUrl || null,
  embeddedFonts: Array.isArray(template.embeddedFonts) ? template.embeddedFonts : [],
  overlayFontFamily: template.overlayFontFamily || DEFAULT_OVERLAY_FONT,
  export: {
    width: template?.export?.width || null,
    height: template?.export?.height || null,
  },
  overlayFields: Array.isArray(template.overlayFields) ? template.overlayFields : [],
});

const normalizeSystemTemplate = (template) => ({
  id: template.id || `default-${Date.now()}`,
  revision: Number.isFinite(Number(template.revision)) ? Number(template.revision) : 0,
  defaultValuesRevision: Number.isFinite(Number(template.defaultValuesRevision))
    ? Number(template.defaultValuesRevision)
    : 0,
  name: template.name || 'Plantilla',
  type: template.type || 'default',
  bankBrand: template.bankBrand || 'BBVA',
  operationHeading: template.operationHeading || 'COMPROBANTE DE LA OPERACION',
  footerText: template.footerText || fallbackTemplates[0].footerText,
  layout: template.layout || 'standard',
  style: template.style || {},
  formGroup: template.formGroup || null,
  defaultValues: template.defaultValues || null,
  backgroundImage: template.backgroundImage || null,
  backgroundImageDataUrl: template.backgroundImageDataUrl || null,
  embeddedFonts: Array.isArray(template.embeddedFonts) ? template.embeddedFonts : [],
  overlayFontFamily: template.overlayFontFamily || DEFAULT_OVERLAY_FONT,
  export: {
    width: template?.export?.width || null,
    height: template?.export?.height || null,
  },
  overlayFields: Array.isArray(template.overlayFields) ? template.overlayFields : [],
});

const readSystemTemplateOverrides = () => {
  try {
    const payload = JSON.parse(localStorage.getItem(SYSTEM_TEMPLATE_OVERRIDE_KEY) || '{}');
    return payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  } catch (error) {
    console.warn('No se pudieron leer las ediciones del diseñador:', error);
    return {};
  }
};

const applySystemTemplateOverrides = (templates) => {
  const overrides = readSystemTemplateOverrides();
  return templates.map((baseTemplate) => {
    const override = overrides[baseTemplate.id];
    if (!override) return baseTemplate;

    const baseRevision = Number(baseTemplate.revision) || 0;
    const overrideRevision = Number(override.revision) || 0;
    if (baseRevision > overrideRevision) return baseTemplate;

    const mergedTemplate = { ...baseTemplate, ...override, id: baseTemplate.id };
    const baseDefaultsRevision = Number(baseTemplate.defaultValuesRevision) || 0;
    const overrideDefaultsRevision = Number(override.defaultValuesRevision) || 0;
    if (baseDefaultsRevision > overrideDefaultsRevision) {
      mergedTemplate.defaultValues = baseTemplate.defaultValues;
      mergedTemplate.defaultValuesRevision = baseDefaultsRevision;
    }

    return normalizeSystemTemplate(mergedTemplate);
  });
};

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

    systemTemplates = applySystemTemplateOverrides(loaded.length ? loaded : [...fallbackTemplates]);
  } catch (error) {
    console.warn('Fallo carga de plantillas desde archivos, usando fallback:', error);
    systemTemplates = applySystemTemplateOverrides([...fallbackTemplates]);
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
  activeUserProfile = localStorage.getItem(SELECTED_USER_STORAGE_KEY) || 'usuario-1';
  if (userProfileSelect) userProfileSelect.value = activeUserProfile;
  const requestedTemplateId = new URLSearchParams(window.location.search).get('template');
  const savedDraft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
  const baseData = savedDraft || sampleReceipt;
  const template = getTemplateById(requestedTemplateId || baseData.templateId);
  const initialData = requestedTemplateId
    ? { ...sampleReceipt, ...(template.defaultValues || {}), templateId: template.id }
    : baseData;
  renderTemplateOptions(template.id);
  fillTemplateFields(template);
  setFormData({ ...initialData, userProfile: activeUserProfile, templateId: template.id });
  applyUserDefaults(activeUserProfile);
  applyCurrentDateTime();
  await ensureTemplateFontsAvailable(template);
  updatePreview();
  ensureLogoAvailable();
};

form.addEventListener('input', () => { saveStatus.textContent = 'Actualizando…'; updatePreview(); });
form.addEventListener('input', () => saveUserDefaultsFromForm());
userProfileSelect?.addEventListener('change', () => {
  saveUserDefaultsFromForm(activeUserProfile);
  activeUserProfile = userProfileSelect.value;
  localStorage.setItem(SELECTED_USER_STORAGE_KEY, activeUserProfile);
  setFormData({ userProfile: activeUserProfile });
  applyUserDefaults(activeUserProfile);
  applyCurrentDateTime();
  updatePreview();
  saveStatus.textContent = `Perfil ${userProfileSelect.selectedOptions[0]?.textContent || ''} cargado`;
});
templateSelect.addEventListener('change', handleTemplateChange);
loadSampleButton.addEventListener('click', () => {
  const template = getTemplateById(templateSelect.value);
  const defaults = template.defaultValues || sampleReceipt;
  renderTemplateOptions(template.id);
  fillTemplateFields(template);
  setFormData({ ...sampleReceipt, ...defaults, userProfile: activeUserProfile, templateId: template.id });
  applyUserDefaults(activeUserProfile);
  applyCurrentDateTime();
  updatePreview();
});
saveTemplateButton.addEventListener('click', saveCustomTemplate);
deleteTemplateButton.addEventListener('click', deleteCustomTemplate);
exportTemplatesButton.addEventListener('click', exportCustomTemplates);
importTemplatesInput.addEventListener('change', importCustomTemplates);
downloadButton.addEventListener('click', downloadReceipt);
mobileDownloadButton.addEventListener('click', downloadReceipt);
printButton.addEventListener('click', printReceiptImage);
mobilePrintButton.addEventListener('click', printReceiptImage);
window.addEventListener('storage', async (event) => {
  if (event.key !== SYSTEM_TEMPLATE_OVERRIDE_KEY) return;
  const currentData = getFormData();
  const currentTemplateId = currentData.templateId;
  await loadSystemTemplatesFromFiles();
  const refreshedTemplate = getTemplateById(currentTemplateId);
  renderTemplateOptions(refreshedTemplate.id);
  fillTemplateFields(refreshedTemplate);
  setFormData({ ...currentData, templateId: refreshedTemplate.id });
  await ensureTemplateFontsAvailable(refreshedTemplate);
  updatePreview();
  saveStatus.textContent = 'Edición del diseñador aplicada';
});
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
initializeMoneyInputs();
initialize();
