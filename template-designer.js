import {
  DEFAULT_OVERLAY_FONT,
  ensureTemplateFontsAvailable,
  renderTemplateToCanvas,
} from './template-renderer.js';

const DEFAULT_TEMPLATE_PATH = 'templates/defaults/banorte.detail.json';
const BBVA_TEMPLATE_PATH = 'templates/defaults/bbva.standard.json';
const TEMPLATE_INDEX_PATH = 'templates/index.json';
const DEFAULT_ASSET_ROOT = 'templates/';
const SYSTEM_TEMPLATE_OVERRIDE_KEY = 'comprobantes.systemTemplateOverrides.v1';
const CUSTOM_TEMPLATE_STORAGE_KEY = 'comprobantes.bbvaTemplates.v1';
const CUSTOM_TEMPLATE_PREFIX = 'custom-';
const JPEG_QUALITY = 0.92;

const BUILT_IN_FONTS = [
  { label: 'Montserrat Banorte', value: '"Montserrat Banorte", Montserrat, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Century Gothic', value: '"Century Gothic", Arial, sans-serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
];

const controls = {
  templateRegistrySelect: document.querySelector('#templateRegistrySelect'),
  loadRegistryTemplate: document.querySelector('#loadRegistryTemplate'),
  createBlankTemplate: document.querySelector('#createBlankTemplate'),
  createFromCurrentTemplate: document.querySelector('#createFromCurrentTemplate'),
  templateIdInput: document.querySelector('#templateIdInput'),
  templateNameInput: document.querySelector('#templateNameInput'),
  templateFile: document.querySelector('#templateFile'),
  backgroundFile: document.querySelector('#backgroundFile'),
  loadDefaultTemplate: document.querySelector('#loadDefaultTemplate'),
  loadBbvaTemplate: document.querySelector('#loadBbvaTemplate'),
  downloadTemplate: document.querySelector('#downloadTemplate'),
  exportProof: document.querySelector('#exportProof'),
  applyToApp: document.querySelector('#applyToApp'),
  updateAppJson: document.querySelector('#updateAppJson'),
  undoChange: document.querySelector('#undoChange'),
  redoChange: document.querySelector('#redoChange'),
  templateFontFamily: document.querySelector('#templateFontFamily'),
  customFontName: document.querySelector('#customFontName'),
  customFontFile: document.querySelector('#customFontFile'),
  fieldSelect: document.querySelector('#fieldSelect'),
  fieldSampleText: document.querySelector('#fieldSampleText'),
  fieldFontFamily: document.querySelector('#fieldFontFamily'),
  fieldFontWeight: document.querySelector('#fieldFontWeight'),
  fieldScaleX: document.querySelector('#fieldScaleX'),
  fieldLineHeight: document.querySelector('#fieldLineHeight'),
  fieldX: document.querySelector('#fieldX'),
  fieldY: document.querySelector('#fieldY'),
  fieldWidth: document.querySelector('#fieldWidth'),
  fieldHeight: document.querySelector('#fieldHeight'),
  fieldFontSize: document.querySelector('#fieldFontSize'),
  fieldColor: document.querySelector('#fieldColor'),
  fieldAlign: document.querySelector('#fieldAlign'),
  centerField: document.querySelector('#centerField'),
  addField: document.querySelector('#addField'),
  duplicateField: document.querySelector('#duplicateField'),
  deleteField: document.querySelector('#deleteField'),
  amountControls: document.querySelector('#amountControls'),
  currencyFontSize: document.querySelector('#currencyFontSize'),
  amountFontSize: document.querySelector('#amountFontSize'),
  suffixFontSize: document.querySelector('#suffixFontSize'),
  currencyFontWeight: document.querySelector('#currencyFontWeight'),
  amountFontWeight: document.querySelector('#amountFontWeight'),
  suffixFontWeight: document.querySelector('#suffixFontWeight'),
  currencyScaleX: document.querySelector('#currencyScaleX'),
  amountScaleX: document.querySelector('#amountScaleX'),
  suffixScaleX: document.querySelector('#suffixScaleX'),
  currencyOffsetX: document.querySelector('#currencyOffsetX'),
  suffixOffsetX: document.querySelector('#suffixOffsetX'),
  currencyOffsetY: document.querySelector('#currencyOffsetY'),
  amountOffsetY: document.querySelector('#amountOffsetY'),
  suffixOffsetY: document.querySelector('#suffixOffsetY'),
  currencyGap: document.querySelector('#currencyGap'),
  suffixGap: document.querySelector('#suffixGap'),
  jsonOutput: document.querySelector('#jsonOutput'),
  applyJson: document.querySelector('#applyJson'),
  editorStatus: document.querySelector('#editorStatus'),
  templateName: document.querySelector('#templateName'),
  stageSize: document.querySelector('#stageSize'),
  stage: document.querySelector('#stage'),
  backgroundImage: document.querySelector('#backgroundImage'),
  renderCanvas: document.querySelector('#renderCanvas'),
  overlayLayer: document.querySelector('#overlayLayer'),
};

const amountControlKeys = [
  'currencyFontSize',
  'amountFontSize',
  'suffixFontSize',
  'currencyFontWeight',
  'amountFontWeight',
  'suffixFontWeight',
  'currencyScaleX',
  'amountScaleX',
  'suffixScaleX',
  'currencyOffsetX',
  'suffixOffsetX',
  'currencyOffsetY',
  'amountOffsetY',
  'suffixOffsetY',
  'currencyGap',
  'suffixGap',
];

const amountDefaults = {
  currencyFontSize: 51,
  amountFontSize: 78,
  suffixFontSize: 52,
  currencyFontWeight: 400,
  amountFontWeight: 400,
  suffixFontWeight: 400,
  currencyScaleX: 1,
  amountScaleX: 1,
  suffixScaleX: 1,
  currencyOffsetX: 0,
  suffixOffsetX: 0,
  currencyOffsetY: 20,
  amountOffsetY: 0,
  suffixOffsetY: 23,
  currencyGap: 18,
  suffixGap: 28,
};

const sampleValues = {
  amountDisplay: '$ 2,800.00 MN',
  destinatarioNombre: 'DAVID M**** M**** M****',
  destinatarioBanco: 'BANORTE',
  sourceAccountSuffix: '0185',
  destinationCardSuffix: '5963',
  conceptoTransferencia: 'David Morales porton',
  aliasDestinatario: 'porton',
  operationDateTime: '25-05-2026 - 17:49:00',
  detailAmount: '$ 900.00 MN',
  detailDateTime: '08-07-2026 - 13:47:21',
  detailDestinationAccount: 'Tarjeta ****9756',
  detailDestinationBank: 'BANCOPPEL',
  detailSourceAccount: 'CUENTA ENLACE PERSONAL SALDO\nPROMEDIO ****9358',
  detailSender: 'Joel Daniel Morales Mendez',
  detailSenderRfc: 'MOMJ911127ND1',
  detailCommission: '$0.00 MN',
  detailTax: '$0.00 MN',
  detailConcept: 'Tsuro',
  detailReference: '260708',
  detailOperationType: 'Transferencia única',
  detailTrackingKey: '38432P01202607085512974778',
};

let template = null;
let designerValues = { ...sampleValues };
let selectedFieldId = null;
let dragState = null;
let undoStack = [];
let redoStack = [];
let jsonFileHandle = null;
let registryTemplates = [];

const clone = (value) => JSON.parse(JSON.stringify(value));
const getFields = () => (Array.isArray(template?.overlayFields) ? template.overlayFields : []);
const getSelectedField = () => getFields().find((field) => field.id === selectedFieldId) || null;
const getTemplateWidth = () => template?.export?.width || 1010;
const getTemplateHeight = () => template?.export?.height || 1600;
const getFontSize = (field) => field?.fontSize || field?.amountFontSize || 32;
const getFieldText = (field) => {
  const value = designerValues[field?.field];
  return value == null ? field?.field || field?.id || '' : String(value);
};

const setEditorStatus = (message, kind = '') => {
  controls.editorStatus.textContent = message;
  controls.editorStatus.classList.toggle('error', kind === 'error');
  controls.editorStatus.classList.toggle('success', kind === 'success');
};

const slugifyTemplateId = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `plantilla-${Date.now()}`;

const syncTemplateMetaControls = () => {
  controls.templateIdInput.value = template?.id || '';
  controls.templateNameInput.value = template?.name || '';
};

const createBlankTemplatePayload = ({ id, name } = {}) => ({
  id: slugifyTemplateId(id || name),
  name: name || 'Nueva plantilla',
  type: 'background',
  formGroup: 'banorte-summary',
  backgroundImage: '',
  overlayFontFamily: DEFAULT_OVERLAY_FONT,
  export: {
    width: 1010,
    height: 1600,
  },
  defaultValues: {},
  overlayFields: [],
});

const populateRegistrySelect = () => {
  controls.templateRegistrySelect.innerHTML = '';
  registryTemplates.forEach((entry) => {
    const option = document.createElement('option');
    option.value = entry.path;
    option.textContent = `${entry.name || entry.id} (${entry.id})`;
    controls.templateRegistrySelect.append(option);
  });
  controls.loadRegistryTemplate.disabled = registryTemplates.length === 0;
};

const loadTemplateRegistry = async () => {
  try {
    const response = await fetch(TEMPLATE_INDEX_PATH, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo leer templates/index.json.');
    const payload = await response.json();
    registryTemplates = Array.isArray(payload.templates) ? payload.templates : [];
    populateRegistrySelect();
  } catch (error) {
    registryTemplates = [
      { id: 'banorte-detail', name: 'Banorte detalle', path: 'defaults/banorte.detail.json' },
      { id: 'bbva', name: 'BBVA compartir', path: 'defaults/bbva.standard.json' },
      { id: 'banorte', name: 'Banorte base', path: 'defaults/banorte.base.json' },
    ];
    populateRegistrySelect();
    setEditorStatus(error.message || 'No se pudo cargar el registro de plantillas.', 'error');
  }
};

const loadRegistryTemplate = async () => {
  const entry = registryTemplates.find((item) => item.path === controls.templateRegistrySelect.value);
  if (!entry) throw new Error('Selecciona una plantilla existente.');
  const response = await fetch(`${DEFAULT_ASSET_ROOT}${entry.path}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`No se pudo cargar templates/${entry.path}.`);
  const payload = await response.json();
  await loadTemplateObject({ ...payload, id: payload.id || entry.id, name: payload.name || entry.name });
  setEditorStatus(`Plantilla cargada: ${entry.name || entry.id}`, 'success');
};

const syncHistoryButtons = () => {
  controls.undoChange.disabled = !undoStack.length;
  controls.redoChange.disabled = !redoStack.length;
};

const rememberState = () => {
  if (!template) return;
  undoStack.push(clone(template));
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  syncHistoryButtons();
};

const resetDesignerValues = () => {
  designerValues = { ...sampleValues, ...(template?.defaultValues || {}) };
};

const getBackgroundSource = () => {
  if (template?.backgroundImageDataUrl) return template.backgroundImageDataUrl;
  if (!template?.backgroundImage) return '';
  if (/^(data:|blob:|https?:)/i.test(template.backgroundImage)) return template.backgroundImage;
  return `${DEFAULT_ASSET_ROOT}${template.backgroundImage}`;
};

const setBackgroundFromTemplate = async () => {
  const source = getBackgroundSource();
  if (!source) {
    controls.backgroundImage.removeAttribute('src');
    drawTemplateCanvas();
    return;
  }

  if (controls.backgroundImage.src === new URL(source, window.location.href).href && controls.backgroundImage.complete) {
    drawTemplateCanvas();
    return;
  }

  await new Promise((resolve) => {
    const finish = () => resolve();
    controls.backgroundImage.addEventListener('load', finish, { once: true });
    controls.backgroundImage.addEventListener('error', finish, { once: true });
    controls.backgroundImage.src = source;
  });
};

const getFontOptions = () => {
  const embedded = Array.isArray(template?.embeddedFonts) ? template.embeddedFonts : [];
  return [
    ...BUILT_IN_FONTS,
    ...embedded
      .filter((font) => font?.family)
      .map((font) => ({
        label: `${font.family} (incrustada)`,
        value: `"${String(font.family).replaceAll('"', '\\"')}", sans-serif`,
      })),
  ];
};

const populateFontSelect = (select, selectedValue, includeInherit = false) => {
  select.innerHTML = '';
  if (includeInherit) {
    const inheritOption = document.createElement('option');
    inheritOption.value = '';
    inheritOption.textContent = 'Heredar de la plantilla';
    select.append(inheritOption);
  }

  getFontOptions().forEach(({ label, value }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  });

  const targetValue = selectedValue || '';
  if (targetValue && ![...select.options].some((option) => option.value === targetValue)) {
    const currentOption = document.createElement('option');
    currentOption.value = targetValue;
    currentOption.textContent = `${targetValue} (actual)`;
    select.append(currentOption);
  }
  select.value = targetValue;
};

const renderFontOptions = () => {
  populateFontSelect(
    controls.templateFontFamily,
    template?.overlayFontFamily || DEFAULT_OVERLAY_FONT,
  );
  populateFontSelect(controls.fieldFontFamily, getSelectedField()?.fontFamily || '', true);
};

const drawTemplateCanvas = () => {
  if (!template) return;
  const backgroundImage =
    controls.backgroundImage.complete && controls.backgroundImage.naturalWidth > 0
      ? controls.backgroundImage
      : null;
  renderTemplateToCanvas({
    canvas: controls.renderCanvas,
    template,
    values: designerValues,
    backgroundImage,
  });
};

const updateJsonOutput = () => {
  controls.jsonOutput.value = template ? JSON.stringify(template, null, 2) : '';
};

const syncStageSize = () => {
  const width = getTemplateWidth();
  const height = getTemplateHeight();
  controls.stage.style.width = `${width}px`;
  controls.stage.style.height = `${height}px`;
  controls.stageSize.textContent = `${width} x ${height}`;
};

const renderFieldOptions = () => {
  controls.fieldSelect.innerHTML = '';
  getFields().forEach((field) => {
    const option = document.createElement('option');
    option.value = field.id;
    option.textContent = field.field || field.id;
    controls.fieldSelect.append(option);
  });
  if (!selectedFieldId && getFields()[0]) selectedFieldId = getFields()[0].id;
  controls.fieldSelect.value = selectedFieldId || '';
};

const syncFieldControls = () => {
  const field = getSelectedField();
  const disabled = !field;
  [
    controls.fieldSampleText,
    controls.fieldFontFamily,
    controls.fieldFontWeight,
    controls.fieldScaleX,
    controls.fieldLineHeight,
    controls.fieldX,
    controls.fieldY,
    controls.fieldWidth,
    controls.fieldHeight,
    controls.fieldFontSize,
    controls.fieldColor,
    controls.fieldAlign,
  ].forEach((control) => {
    control.disabled = disabled;
  });
  if (!field) return;

  controls.fieldSampleText.value = getFieldText(field);
  controls.fieldX.value = Math.round(field.x || 0);
  controls.fieldY.value = Math.round(field.y || 0);
  controls.fieldWidth.value = Math.round(field.width || 1);
  controls.fieldHeight.value = Math.round(field.height || getFontSize(field) * 1.2);
  controls.fieldFontSize.value = Number(getFontSize(field).toFixed(3));
  controls.fieldFontWeight.value = field.amountLayout
    ? field.amountFontWeight || 400
    : field.fontWeight || 400;
  controls.fieldScaleX.value = field.amountLayout ? field.amountScaleX || 1 : field.scaleX || 1;
  controls.fieldLineHeight.value = field.lineHeight || 1.1;
  controls.fieldLineHeight.disabled = Boolean(field.amountLayout);
  controls.fieldColor.value = /^#[0-9a-f]{6}$/i.test(field.color || '') ? field.color : '#3f474d';
  controls.fieldAlign.value = field.align || 'left';
  controls.amountControls.hidden = !field.amountLayout;

  if (field.amountLayout) {
    amountControlKeys.forEach((key) => {
      controls[key].value = field[key] ?? amountDefaults[key];
    });
  }
  renderFontOptions();
};

const renderFields = () => {
  drawTemplateCanvas();
  controls.overlayLayer.innerHTML = '';
  getFields().forEach((field) => {
    const node = document.createElement('div');
    node.className = 'overlay-field';
    node.dataset.fieldId = field.id;
    node.classList.toggle('selected', field.id === selectedFieldId);
    node.style.left = `${field.x || 0}px`;
    node.style.top = `${field.y || 0}px`;
    node.style.width = `${field.width || 100}px`;
    node.style.height = `${field.height || getFontSize(field) * 1.2}px`;
    node.title = field.field || field.id;
    controls.overlayLayer.append(node);
  });
};

const markSelectedField = () => {
  controls.overlayLayer.querySelectorAll('.overlay-field').forEach((node) => {
    node.classList.toggle('selected', node.dataset.fieldId === selectedFieldId);
  });
};

const renderTemplate = () => {
  if (!template) return;
  controls.templateName.textContent = template.name || template.id || 'Plantilla';
  syncTemplateMetaControls();
  syncStageSize();
  renderFieldOptions();
  renderFontOptions();
  renderFields();
  syncFieldControls();
  updateJsonOutput();
};

const restoreState = async (nextTemplate) => {
  const previousSelection = selectedFieldId;
  template = clone(nextTemplate);
  resetDesignerValues();
  selectedFieldId = getFields().some((field) => field.id === previousSelection)
    ? previousSelection
    : getFields()[0]?.id || null;
  await Promise.all([setBackgroundFromTemplate(), ensureTemplateFontsAvailable(template)]);
  renderTemplate();
};

const loadTemplateObject = async (payload) => {
  template = clone(payload);
  if (!Array.isArray(template.overlayFields)) throw new Error('overlayFields debe ser una lista.');
  undoStack = [];
  redoStack = [];
  syncHistoryButtons();
  resetDesignerValues();
  selectedFieldId = getFields()[0]?.id || null;
  await Promise.all([setBackgroundFromTemplate(), ensureTemplateFontsAvailable(template)]);
  renderTemplate();
};

const loadDefaultTemplate = async () => {
  const response = await fetch(DEFAULT_TEMPLATE_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo cargar Banorte detalle.');
  await loadTemplateObject(await response.json());
};

const loadBbvaTemplate = async () => {
  const response = await fetch(BBVA_TEMPLATE_PATH, { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo cargar BBVA compartir.');
  await loadTemplateObject(await response.json());
};

const loadTemplateFile = async (file) => {
  await loadTemplateObject(JSON.parse(await file.text()));
};

const createBlankTemplate = async () => {
  const payload = createBlankTemplatePayload({
    id: controls.templateIdInput.value,
    name: controls.templateNameInput.value || 'Nueva plantilla',
  });
  await loadTemplateObject(payload);
  setEditorStatus('Plantilla nueva creada. Agrega fondo, campos y descarga el JSON.', 'success');
};

const createFromCurrentTemplate = async () => {
  const base = template ? clone(template) : createBlankTemplatePayload();
  const requestedId = slugifyTemplateId(controls.templateIdInput.value);
  const baseId = slugifyTemplateId(base.id || 'plantilla');
  base.id = requestedId && requestedId !== baseId ? requestedId : `${baseId}-copia`;
  const requestedName = controls.templateNameInput.value.trim();
  base.name = requestedName && requestedName !== base.name ? requestedName : `${base.name || 'Plantilla'} copia`;
  await loadTemplateObject(base);
  setEditorStatus('Copia creada. Cambia ID/nombre si vas a guardarla como plantilla nueva.', 'success');
};

const addNewField = () => {
  if (!template) return;
  rememberState();
  const fields = getFields();
  const nextIndex = fields.length + 1;
  const id = `campo-${nextIndex}`;
  const fieldName = `customField${nextIndex}`;
  template.overlayFields = fields;
  template.defaultValues = template.defaultValues || {};
  template.defaultValues[fieldName] = `Campo ${nextIndex}`;
  designerValues[fieldName] = template.defaultValues[fieldName];
  fields.push({
    id,
    field: fieldName,
    x: 100,
    y: 100,
    width: 360,
    height: 44,
    fontSize: 32,
    fontWeight: 400,
    color: '#3f474d',
    align: 'left',
  });
  selectedFieldId = id;
  renderTemplate();
  setEditorStatus('Campo agregado');
};

const patchSelectedField = (patch) => {
  const field = getSelectedField();
  if (!field) return;
  rememberState();
  Object.assign(field, patch);
  renderFields();
  syncFieldControls();
  updateJsonOutput();
};

const handleFieldControlInput = (event) => {
  const map = {
    fieldX: 'x',
    fieldY: 'y',
    fieldWidth: 'width',
    fieldHeight: 'height',
    fieldColor: 'color',
    fieldAlign: 'align',
  };
  const field = getSelectedField();
  if (!field) return;

  if (event.target === controls.fieldFontSize) {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    patchSelectedField(field.amountLayout ? { amountFontSize: value } : { fontSize: value });
    return;
  }
  if (event.target === controls.fieldFontWeight) {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    patchSelectedField(
      field.amountLayout
        ? {
            currencyFontWeight: value,
            amountFontWeight: value,
            suffixFontWeight: value,
          }
        : { fontWeight: value },
    );
    return;
  }
  if (event.target === controls.fieldScaleX) {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    patchSelectedField(field.amountLayout ? { amountScaleX: value } : { scaleX: value });
    return;
  }
  if (event.target === controls.fieldLineHeight) {
    const value = Number(event.target.value);
    if (!Number.isFinite(value)) return;
    patchSelectedField({ lineHeight: value });
    return;
  }

  const key = map[event.target.id];
  if (!key) return;
  const value = key === 'color' || key === 'align' ? event.target.value : Number(event.target.value);
  if (key !== 'color' && key !== 'align' && !Number.isFinite(value)) return;
  patchSelectedField({ [key]: value });
};

const handleAmountControlInput = (event) => {
  const key = event.target.id;
  const value = Number(event.target.value);
  if (!amountControlKeys.includes(key) || !Number.isFinite(value)) return;
  patchSelectedField({ [key]: value });
};

const handlePointerDown = (event) => {
  const node = event.target.closest('.overlay-field');
  if (!node) return;
  const field = getFields().find((item) => item.id === node.dataset.fieldId);
  if (!field) return;
  rememberState();
  event.preventDefault();
  selectedFieldId = field.id;
  markSelectedField();
  renderFieldOptions();
  syncFieldControls();

  dragState = {
    pointerId: event.pointerId,
    field,
    node,
    startX: event.clientX,
    startY: event.clientY,
    originalX: field.x || 0,
    originalY: field.y || 0,
  };
  node.setPointerCapture?.(event.pointerId);
};

const handlePointerMove = (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  dragState.field.x = Math.round(dragState.originalX + event.clientX - dragState.startX);
  dragState.field.y = Math.round(dragState.originalY + event.clientY - dragState.startY);
  dragState.node.style.left = `${dragState.field.x}px`;
  dragState.node.style.top = `${dragState.field.y}px`;
  drawTemplateCanvas();
  syncFieldControls();
  updateJsonOutput();
};

const handlePointerUp = (event) => {
  if (!dragState || dragState.pointerId !== event.pointerId) return;
  dragState = null;
  setEditorStatus('Posición actualizada');
};

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const getTemplateFilename = () => {
  const knownNames = {
    bbva: 'bbva.standard.json',
    'banorte-detail': 'banorte.detail.json',
    banorte: 'banorte.base.json',
  };
  return knownNames[template?.id] || `${template?.id || 'template'}.json`;
};

const serializeTemplate = () => JSON.stringify(template, null, 2);

const isRegisteredTemplateId = (templateId) => registryTemplates.some((entry) => entry.id === templateId);

const getAppTemplateId = () => {
  if (!template?.id) return '';
  return isRegisteredTemplateId(template.id) || template.id.startsWith(CUSTOM_TEMPLATE_PREFIX)
    ? template.id
    : `${CUSTOM_TEMPLATE_PREFIX}${template.id}`;
};

const downloadTemplate = () => {
  if (!template) return;
  downloadBlob(new Blob([serializeTemplate()], { type: 'application/json' }), getTemplateFilename());
  setEditorStatus('JSON descargado', 'success');
};

const exportProof = async () => {
  if (!template) return;
  await Promise.all([setBackgroundFromTemplate(), ensureTemplateFontsAvailable(template)]);
  drawTemplateCanvas();
  const blob = await new Promise((resolve) => controls.renderCanvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob) throw new Error('No se pudo crear la prueba JPG.');
  downloadBlob(blob, `${template.id || 'template'}-prueba.jpg`);
  setEditorStatus('Prueba JPG creada con el mismo motor de la app', 'success');
};

const saveCustomTemplateForApp = () => {
  if (!template?.id) throw new Error('La plantilla necesita un id para agregarse a la app.');
  const appTemplate = {
    ...clone(template),
    id: getAppTemplateId(),
    name: template.name || template.id,
  };
  let customTemplates = [];
  try {
    const storedValue = JSON.parse(localStorage.getItem(CUSTOM_TEMPLATE_STORAGE_KEY) || '[]');
    if (Array.isArray(storedValue)) customTemplates = storedValue;
  } catch (error) {
    console.warn('Se reemplazara una lista local invalida de plantillas personalizadas:', error);
  }
  const existingIndex = customTemplates.findIndex((item) => item?.id === appTemplate.id);
  if (existingIndex >= 0) customTemplates[existingIndex] = appTemplate;
  else customTemplates.push(appTemplate);
  localStorage.setItem(CUSTOM_TEMPLATE_STORAGE_KEY, JSON.stringify(customTemplates));
};

const saveRuntimeOverride = () => {
  if (!template?.id) throw new Error('La plantilla necesita un id para aplicarse en la app.');
  if (!isRegisteredTemplateId(template.id)) {
    saveCustomTemplateForApp();
    return;
  }
  let overrides = {};
  try {
    const storedValue = JSON.parse(localStorage.getItem(SYSTEM_TEMPLATE_OVERRIDE_KEY) || '{}');
    if (storedValue && typeof storedValue === 'object' && !Array.isArray(storedValue)) {
      overrides = storedValue;
    }
  } catch (error) {
    console.warn('Se reemplazará una anulación local inválida:', error);
  }
  overrides[template.id] = clone(template);
  localStorage.setItem(SYSTEM_TEMPLATE_OVERRIDE_KEY, JSON.stringify(overrides));
};

const applyToApp = ({ openApp = true } = {}) => {
  saveRuntimeOverride();
  const appTemplateId = getAppTemplateId();
  setEditorStatus(
    isRegisteredTemplateId(template.id)
      ? 'Edicion aplicada. La app ya usara esta version.'
      : 'Plantilla nueva agregada a la app como personalizada.',
    'success',
  );
  if (openApp) {
    const url = new URL('index.html', window.location.href);
    url.searchParams.set('template', appTemplateId);
    url.searchParams.set('edited', '1');
    window.open(url, '_blank', 'noopener');
  }
};

const updateAppJson = async () => {
  if (!template) return;
  let runtimeApplied = true;
  try {
    saveRuntimeOverride();
  } catch (error) {
    runtimeApplied = false;
    console.warn('El JSON puede guardarse, pero no cupo en el almacenamiento local:', error);
  }
  const json = serializeTemplate();
  const filename = getTemplateFilename();

  if ('showSaveFilePicker' in window) {
    try {
      jsonFileHandle ||= await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Plantilla JSON',
            accept: { 'application/json': ['.json'] },
          },
        ],
      });
      const writable = await jsonFileHandle.createWritable();
      await writable.write(json);
      await writable.close();
      setEditorStatus(
        runtimeApplied
          ? `${filename} actualizado y aplicado en la app`
          : `${filename} actualizado; recarga la app para usar el archivo`,
        'success',
      );
      return;
    } catch (error) {
      if (error?.name === 'AbortError') {
        setEditorStatus('Actualización del archivo cancelada');
        return;
      }
      jsonFileHandle = null;
      throw error;
    }
  }

  downloadBlob(new Blob([json], { type: 'application/json' }), filename);
  setEditorStatus(
    runtimeApplied
      ? `Se descargó ${filename} y la edición quedó aplicada en la app`
      : `Se descargó ${filename}; reemplázalo y recarga la app`,
    'success',
  );
};

controls.loadDefaultTemplate.addEventListener('click', () => {
  loadDefaultTemplate()
    .then(() => setEditorStatus('Banorte detalle cargada'))
    .catch((error) => setEditorStatus(error.message, 'error'));
});

controls.loadBbvaTemplate.addEventListener('click', () => {
  loadBbvaTemplate()
    .then(() => setEditorStatus('BBVA compartir cargada'))
    .catch((error) => setEditorStatus(error.message, 'error'));
});

controls.loadRegistryTemplate.addEventListener('click', () => {
  loadRegistryTemplate().catch((error) => setEditorStatus(error.message, 'error'));
});

controls.createBlankTemplate.addEventListener('click', () => {
  createBlankTemplate().catch((error) => setEditorStatus(error.message, 'error'));
});

controls.createFromCurrentTemplate.addEventListener('click', () => {
  createFromCurrentTemplate().catch((error) => setEditorStatus(error.message, 'error'));
});

controls.templateFile.addEventListener('change', () => {
  const [file] = controls.templateFile.files || [];
  if (!file) return;
  loadTemplateFile(file)
    .then(() => setEditorStatus(`${file.name} cargado`))
    .catch((error) => setEditorStatus(error.message || 'No se pudo abrir el JSON.', 'error'));
});

controls.templateIdInput.addEventListener('change', () => {
  if (!template) return;
  rememberState();
  template.id = slugifyTemplateId(controls.templateIdInput.value);
  syncTemplateMetaControls();
  updateJsonOutput();
  setEditorStatus('ID de plantilla actualizado');
});

controls.templateNameInput.addEventListener('input', () => {
  if (!template) return;
  template.name = controls.templateNameInput.value || template.id || 'Plantilla';
  controls.templateName.textContent = template.name;
  updateJsonOutput();
});

controls.backgroundFile.addEventListener('change', async () => {
  const [file] = controls.backgroundFile.files || [];
  if (!file || !template) return;
  try {
    rememberState();
    template.backgroundImageDataUrl = await fileToDataUrl(file);
    await setBackgroundFromTemplate();
    renderTemplate();
    setEditorStatus('Fondo incrustado en la edición', 'success');
  } catch (error) {
    setEditorStatus(error.message || 'No se pudo cargar el fondo.', 'error');
  }
});

controls.customFontFile.addEventListener('change', async () => {
  const [file] = controls.customFontFile.files || [];
  if (!file || !template) return;
  const inferredName = file.name.replace(/\.(ttf|otf|woff2?)$/i, '').replace(/[-_]+/g, ' ').trim();
  const family = controls.customFontName.value.trim() || inferredName || 'Fuente personalizada';
  try {
    const dataUrl = await fileToDataUrl(file);
    rememberState();
    const embeddedFonts = Array.isArray(template.embeddedFonts) ? template.embeddedFonts : [];
    template.embeddedFonts = [
      ...embeddedFonts.filter((font) => font.family !== family),
      {
        family,
        fileName: file.name,
        weight: '100 900',
        style: 'normal',
        dataUrl,
      },
    ];
    template.overlayFontFamily = `"${family.replaceAll('"', '\\"')}", sans-serif`;
    await ensureTemplateFontsAvailable(template);
    renderTemplate();
    controls.customFontName.value = family;
    controls.customFontFile.value = '';
    setEditorStatus(`${family} incrustada y seleccionada`, 'success');
  } catch (error) {
    setEditorStatus(error.message || 'No se pudo cargar la fuente.', 'error');
  }
});

controls.templateFontFamily.addEventListener('change', async () => {
  if (!template) return;
  rememberState();
  template.overlayFontFamily = controls.templateFontFamily.value || DEFAULT_OVERLAY_FONT;
  await ensureTemplateFontsAvailable(template);
  renderTemplate();
  setEditorStatus('Fuente general actualizada');
});

controls.fieldFontFamily.addEventListener('change', async () => {
  const field = getSelectedField();
  if (!field) return;
  rememberState();
  if (controls.fieldFontFamily.value) field.fontFamily = controls.fieldFontFamily.value;
  else delete field.fontFamily;
  await ensureTemplateFontsAvailable(template);
  renderFields();
  syncFieldControls();
  updateJsonOutput();
  setEditorStatus('Fuente del campo actualizada');
});

controls.fieldSampleText.addEventListener('focus', rememberState);
controls.fieldSampleText.addEventListener('input', () => {
  const field = getSelectedField();
  if (!field?.field || !template) return;
  template.defaultValues ||= {};
  template.defaultValues[field.field] = controls.fieldSampleText.value;
  designerValues[field.field] = controls.fieldSampleText.value;
  drawTemplateCanvas();
  updateJsonOutput();
});
controls.fieldSampleText.addEventListener('change', () => setEditorStatus('Texto de prueba y valor predeterminado actualizados'));

controls.backgroundImage.addEventListener('load', drawTemplateCanvas);
controls.downloadTemplate.addEventListener('click', downloadTemplate);
controls.exportProof.addEventListener('click', () => exportProof().catch((error) => setEditorStatus(error.message, 'error')));
controls.applyToApp.addEventListener('click', () => {
  try {
    applyToApp();
  } catch (error) {
    setEditorStatus(error.message || 'No se pudo aplicar la edición.', 'error');
  }
});
controls.updateAppJson.addEventListener('click', () => {
  updateAppJson().catch((error) => setEditorStatus(error.message || 'No se pudo actualizar el JSON.', 'error'));
});

controls.undoChange.addEventListener('click', () => {
  if (!undoStack.length || !template) return;
  redoStack.push(clone(template));
  restoreState(undoStack.pop())
    .then(() => {
      syncHistoryButtons();
      setEditorStatus('Cambio deshecho');
    })
    .catch((error) => setEditorStatus(error.message, 'error'));
});

controls.redoChange.addEventListener('click', () => {
  if (!redoStack.length || !template) return;
  undoStack.push(clone(template));
  restoreState(redoStack.pop())
    .then(() => {
      syncHistoryButtons();
      setEditorStatus('Cambio rehecho');
    })
    .catch((error) => setEditorStatus(error.message, 'error'));
});

controls.fieldSelect.addEventListener('change', () => {
  selectedFieldId = controls.fieldSelect.value;
  renderTemplate();
});

[
  controls.fieldX,
  controls.fieldY,
  controls.fieldWidth,
  controls.fieldHeight,
  controls.fieldFontSize,
  controls.fieldFontWeight,
  controls.fieldScaleX,
  controls.fieldLineHeight,
  controls.fieldColor,
  controls.fieldAlign,
].forEach((control) => control.addEventListener('input', handleFieldControlInput));

amountControlKeys.forEach((key) => controls[key].addEventListener('input', handleAmountControlInput));

controls.centerField.addEventListener('click', () => {
  const field = getSelectedField();
  if (!field) return;
  patchSelectedField({ x: Math.round((getTemplateWidth() - (field.width || 0)) / 2), align: 'center' });
});

controls.addField.addEventListener('click', addNewField);

controls.duplicateField.addEventListener('click', () => {
  const field = getSelectedField();
  if (!field) return;
  rememberState();
  const copy = clone(field);
  copy.id = `${field.id || 'field'}-copy-${Date.now()}`;
  copy.x = (field.x || 0) + 20;
  copy.y = (field.y || 0) + 20;
  template.overlayFields.push(copy);
  selectedFieldId = copy.id;
  if (copy.field) {
    template.defaultValues ||= {};
    template.defaultValues[copy.field] = getFieldText(field);
  }
  renderTemplate();
  setEditorStatus('Campo duplicado');
});

controls.deleteField.addEventListener('click', () => {
  const field = getSelectedField();
  if (!field) return;
  rememberState();
  template.overlayFields = getFields().filter((item) => item.id !== field.id);
  selectedFieldId = getFields()[0]?.id || null;
  renderTemplate();
  setEditorStatus('Campo eliminado; puedes deshacer');
});

controls.applyJson.addEventListener('click', async () => {
  try {
    const payload = JSON.parse(controls.jsonOutput.value);
    if (!payload || !Array.isArray(payload.overlayFields)) {
      throw new Error('overlayFields debe ser una lista.');
    }
    rememberState();
    template = clone(payload);
    resetDesignerValues();
    selectedFieldId = getFields()[0]?.id || null;
    await Promise.all([setBackgroundFromTemplate(), ensureTemplateFontsAvailable(template)]);
    renderTemplate();
    setEditorStatus('JSON aplicado', 'success');
  } catch (error) {
    setEditorStatus(error.message || 'JSON inválido', 'error');
  }
});

window.addEventListener('keydown', (event) => {
  const field = getSelectedField();
  if (!field || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  const movement = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[event.key];
  if (!movement) return;
  event.preventDefault();
  const step = event.shiftKey ? 10 : 1;
  patchSelectedField({
    x: (field.x || 0) + movement[0] * step,
    y: (field.y || 0) + movement[1] * step,
  });
});

controls.overlayLayer.addEventListener('pointerdown', handlePointerDown);
controls.overlayLayer.addEventListener('pointermove', handlePointerMove);
controls.overlayLayer.addEventListener('pointerup', handlePointerUp);
controls.overlayLayer.addEventListener('pointercancel', handlePointerUp);

const initializeDesigner = async () => {
  await loadTemplateRegistry();
  const requestedTemplateId = new URLSearchParams(window.location.search).get('template');
  if (requestedTemplateId) {
    const requestedEntry = registryTemplates.find((entry) => entry.id === requestedTemplateId);
    if (requestedEntry) {
      controls.templateRegistrySelect.value = requestedEntry.path;
      await loadRegistryTemplate();
      return;
    }
  }
  if (registryTemplates.length) {
    controls.templateRegistrySelect.value =
      registryTemplates.find((entry) => entry.id === 'banorte-detail')?.path || registryTemplates[0].path;
    await loadRegistryTemplate();
    return;
  }
  await loadDefaultTemplate();
};

initializeDesigner().catch((error) => {
  controls.templateName.textContent = 'Carga un JSON para empezar';
  setEditorStatus(error.message || 'No se pudo cargar la plantilla.', 'error');
});
