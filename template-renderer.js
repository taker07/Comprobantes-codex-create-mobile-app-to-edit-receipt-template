const DEFAULT_OVERLAY_FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const loadedEmbeddedFonts = new Set();

const numberOr = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const splitAmountDisplay = (value) => {
  const text = value == null ? '' : String(value).trim();
  const match = text.match(/^([^0-9-]*?)\s*([-+]?\d[\d,]*(?:\.\d+)?)\s*([^0-9]*)$/);
  if (!match) return { currency: '', amount: text, suffix: '' };
  return {
    currency: match[1].trim(),
    amount: match[2],
    suffix: match[3].trim(),
  };
};

const getOverlayText = (layer, values) => {
  const value = values?.[layer.field];
  if (value == null) return '';
  const text = String(value);
  if (!layer.amountPart) return text;
  return splitAmountDisplay(text)[layer.amountPart] || '';
};

const drawTextLayer = (ctx, text, x, y, width, align, lineHeight = 0) => {
  const drawX = align === 'right' ? x + width : align === 'center' ? x + width / 2 : x;
  String(text)
    .split('\n')
    .forEach((line, index) => ctx.fillText(line, drawX, y + index * lineHeight, width));
};

const getAmountLayout = (layer, value) => {
  const parts = splitAmountDisplay(value);
  return {
    currency: parts.currency || '$',
    amount: parts.amount,
    suffix: parts.suffix || 'MN',
    currencySize: numberOr(layer.currencyFontSize, 51),
    amountSize: numberOr(layer.amountFontSize, 78),
    suffixSize: numberOr(layer.suffixFontSize, 52),
    currencyWeight: numberOr(layer.currencyFontWeight, 400),
    amountWeight: numberOr(layer.amountFontWeight, 400),
    suffixWeight: numberOr(layer.suffixFontWeight, 400),
    currencyScaleX: numberOr(layer.currencyScaleX, 1),
    amountScaleX: numberOr(layer.amountScaleX, 1),
    suffixScaleX: numberOr(layer.suffixScaleX, 1),
    commaText: layer.commaText || ',',
    commaFontFamily: layer.commaFontFamily || null,
    commaSize: numberOr(layer.commaFontSize, numberOr(layer.amountFontSize, 78)),
    commaWeight: numberOr(layer.commaFontWeight, 400),
    commaOffsetY: numberOr(layer.commaOffsetY, numberOr(layer.amountOffsetY, 0)),
    commaGapBefore: numberOr(layer.commaGapBefore, 0),
    commaGapAfter: numberOr(layer.commaGapAfter, 0),
    currencyOffsetY: numberOr(layer.currencyOffsetY, 20),
    currencyOffsetX: numberOr(layer.currencyOffsetX, 0),
    amountOffsetY: numberOr(layer.amountOffsetY, 0),
    suffixOffsetY: numberOr(layer.suffixOffsetY, 23),
    suffixOffsetX: numberOr(layer.suffixOffsetX, 0),
    currencyGap: numberOr(layer.currencyGap, 18),
    suffixGap: numberOr(layer.suffixGap, 28),
  };
};

const getAmountTokens = (amount) => {
  const tokens = [];
  let digitBuffer = '';
  [...String(amount || '')].forEach((character) => {
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
        measureAmountPart(
          ctx,
          commaFontFamily,
          amountLayout.commaWeight,
          amountLayout.commaSize * scale,
          amountLayout.commaText,
        ) +
        amountLayout.commaGapAfter * scale
      );
    }
    return (
      width +
      measureAmountPart(
        ctx,
        fontFamily,
        amountLayout.amountWeight,
        amountLayout.amountSize * scale,
        token.value,
      ) *
        amountLayout.amountScaleX
    );
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
      currencyWidth: currencyWidth * amountLayout.currencyScaleX,
      amountWidth,
      suffixWidth: suffixWidth * amountLayout.suffixScaleX,
      totalWidth:
        currencyWidth * amountLayout.currencyScaleX +
        amountLayout.currencyGap * scale +
        amountWidth +
        amountLayout.suffixGap * scale +
        suffixWidth * amountLayout.suffixScaleX,
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
      const width = measureAmountPart(
        ctx,
        commaFontFamily,
        amountLayout.commaWeight,
        amountLayout.commaSize * scale,
        amountLayout.commaText,
      );
      const positionedToken = {
        ...token,
        value: amountLayout.commaText,
        fontFamily: commaFontFamily,
        x: currentX,
        width,
      };
      currentX += width + amountLayout.commaGapAfter * scale;
      return positionedToken;
    }
    const width =
      measureAmountPart(
        ctx,
        fontFamily,
        amountLayout.amountWeight,
        amountLayout.amountSize * scale,
        token.value,
      ) * amountLayout.amountScaleX;
    const positionedToken = { ...token, x: currentX, width };
    currentX += width;
    return positionedToken;
  });
};

const drawAmountOverlay = (ctx, template, layer, value) => {
  const amountLayout = getAmountLayout(layer, value);
  const fontFamily = layer.fontFamily || template.overlayFontFamily || DEFAULT_OVERLAY_FONT;
  const maxWidth = numberOr(layer.width, 540);
  const fitted = fitAmountLayout(ctx, fontFamily, amountLayout, maxWidth);
  const remainingWidth = maxWidth - fitted.totalWidth;
  const alignmentOffset = layer.align === 'right' ? remainingWidth : layer.align === 'center' ? remainingWidth / 2 : 0;
  const startX = numberOr(layer.x, 0) + alignmentOffset;
  const currencyX = startX;
  const amountX = currencyX + fitted.currencyWidth + amountLayout.currencyGap * fitted.scale;
  const suffixX = amountX + fitted.amountWidth + amountLayout.suffixGap * fitted.scale;
  const amountTokens = getAmountTokenPositions(ctx, fontFamily, amountLayout, fitted.scale, amountX);
  const layerY = numberOr(layer.y, 0);

  const drawPart = (
    text,
    x,
    offsetY,
    size,
    weight,
    partFontFamily = fontFamily,
    horizontalScale = 1,
  ) => {
    ctx.font = `${weight} ${size * fitted.scale}px ${partFontFamily}`;
    if (horizontalScale === 1) {
      ctx.fillText(text, x, layerY + offsetY * fitted.scale);
      return;
    }
    ctx.save();
    ctx.translate(x, layerY + offsetY * fitted.scale);
    ctx.scale(horizontalScale, 1);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  };

  ctx.fillStyle = layer.color || '#3D474E';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  drawPart(
    amountLayout.currency,
    currencyX + amountLayout.currencyOffsetX,
    amountLayout.currencyOffsetY,
    amountLayout.currencySize,
    amountLayout.currencyWeight,
    fontFamily,
    amountLayout.currencyScaleX,
  );
  amountTokens.forEach((token) => {
    drawPart(
      token.value,
      token.x,
      token.type === 'comma' ? amountLayout.commaOffsetY : amountLayout.amountOffsetY,
      token.type === 'comma' ? amountLayout.commaSize : amountLayout.amountSize,
      token.type === 'comma' ? amountLayout.commaWeight : amountLayout.amountWeight,
      token.fontFamily || fontFamily,
      token.type === 'comma' ? 1 : amountLayout.amountScaleX,
    );
  });
  drawPart(
    amountLayout.suffix,
    suffixX + amountLayout.suffixOffsetX,
    amountLayout.suffixOffsetY,
    amountLayout.suffixSize,
    amountLayout.suffixWeight,
    fontFamily,
    amountLayout.suffixScaleX,
  );
};

const registerEmbeddedFonts = async (template) => {
  const embeddedFonts = Array.isArray(template?.embeddedFonts) ? template.embeddedFonts : [];
  if (!embeddedFonts.length || !window.FontFace || !document.fonts?.add) return;

  await Promise.all(
    embeddedFonts.map(async (font) => {
      const family = String(font?.family || '').trim();
      const dataUrl = String(font?.dataUrl || '').trim();
      if (!family || !dataUrl) return;
      const weight = String(font.weight || '100 900');
      const style = String(font.style || 'normal');
      const cacheKey = `${family}|${weight}|${style}|${dataUrl.length}|${dataUrl.slice(-48)}`;
      if (loadedEmbeddedFonts.has(cacheKey)) return;

      const fontFace = new FontFace(family, `url(${JSON.stringify(dataUrl)})`, { weight, style });
      await fontFace.load();
      document.fonts.add(fontFace);
      loadedEmbeddedFonts.add(cacheKey);
    }),
  );
};

const ensureTemplateFontsAvailable = async (template) => {
  if (!template) return;
  try {
    await registerEmbeddedFonts(template);
    if (!document.fonts?.load) return;
    const requests = new Set();
    const fallbackFamily = template.overlayFontFamily || DEFAULT_OVERLAY_FONT;
    const fields = Array.isArray(template.overlayFields) ? template.overlayFields : [];

    fields.forEach((layer) => {
      const fontFamily = layer.fontFamily || fallbackFamily;
      if (layer.amountLayout) {
        requests.add(`${layer.currencyFontWeight || 400} ${layer.currencyFontSize || 22}px ${fontFamily}`);
        requests.add(`${layer.amountFontWeight || 400} ${layer.amountFontSize || 37}px ${fontFamily}`);
        requests.add(`${layer.suffixFontWeight || 400} ${layer.suffixFontSize || 23}px ${fontFamily}`);
        if (layer.commaFontFamily) {
          requests.add(
            `${layer.commaFontWeight || 400} ${layer.commaFontSize || layer.amountFontSize || 37}px ${layer.commaFontFamily}`,
          );
        }
        return;
      }
      requests.add(`${layer.fontWeight || 400} ${layer.fontSize || 14}px ${fontFamily}`);
    });

    await Promise.all([...requests].map((descriptor) => document.fonts.load(descriptor)));
    await document.fonts.ready;
  } catch (error) {
    console.warn('No se pudo precargar una fuente de plantilla:', error);
  }
};

const renderTemplateToCanvas = ({ canvas, template, values = {}, backgroundImage = null }) => {
  if (!canvas || !template) throw new Error('Falta el canvas o la plantilla.');
  const width = numberOr(template?.export?.width, canvas.width || 1010);
  const height = numberOr(template?.export?.height, canvas.height || 1600);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo preparar el canvas.');
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, height);
  if (backgroundImage) ctx.drawImage(backgroundImage, 0, 0, width, height);

  const fields = Array.isArray(template.overlayFields) ? template.overlayFields : [];
  fields.forEach((layer) => {
    const value = values[layer.field];
    if (layer.amountLayout && (value == null || !String(value).trim())) return;
    const text = layer.amountLayout ? String(value) : getOverlayText(layer, values);
    if (!text) return;

    const x = numberOr(layer.x, 0);
    const y = numberOr(layer.y, 0);
    const canvasOffsetY = numberOr(layer.canvasOffsetY, 0);
    const fieldWidth = numberOr(layer.width, width);
    const fontSize = numberOr(layer.fontSize, 24);
    const fieldHeight = numberOr(layer.height, Math.ceil(fontSize * 1.2));

    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, fieldWidth, fieldHeight);
    ctx.clip();
    if (layer.backgroundColor) {
      ctx.fillStyle = layer.backgroundColor;
      ctx.fillRect(x, y, fieldWidth, fieldHeight);
    }

    if (layer.amountLayout) {
      drawAmountOverlay(ctx, template, layer, text);
      ctx.restore();
      return;
    }

    const fontWeight = numberOr(layer.fontWeight, 400);
    const fontFamily = layer.fontFamily || template.overlayFontFamily || DEFAULT_OVERLAY_FONT;
    const align = layer.align || 'left';
    const scaleX = numberOr(layer.scaleX, 1);
    const lineHeight = fontSize * numberOr(layer.lineHeight, 1.1);

    ctx.fillStyle = layer.color || '#2f3b4b';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = align === 'right' ? 'right' : align === 'center' ? 'center' : 'left';
    ctx.textBaseline = 'top';
    if (scaleX === 1) {
      drawTextLayer(ctx, text, x, y + canvasOffsetY, fieldWidth, align, lineHeight);
    } else {
      ctx.translate(x, y + canvasOffsetY);
      ctx.scale(scaleX, 1);
      drawTextLayer(ctx, text, 0, 0, fieldWidth / scaleX, align, lineHeight);
    }
    ctx.restore();
  });

  return canvas;
};

export {
  DEFAULT_OVERLAY_FONT,
  ensureTemplateFontsAvailable,
  fitAmountLayout,
  getAmountLayout,
  getAmountTokenPositions,
  renderTemplateToCanvas,
  splitAmountDisplay,
};
