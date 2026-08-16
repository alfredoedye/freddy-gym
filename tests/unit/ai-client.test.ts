import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateText } from 'ai';
import { callLLM, parseJSONResponse } from '@/lib/ai/client';

vi.mock('ai', () => ({ generateText: vi.fn() }));

const generateTextMock = vi.mocked(generateText);

describe('parseJSONResponse', () => {
  it('parsea JSON directo', () => {
    expect(parseJSONResponse('{"a": 1}')).toEqual({ a: 1 });
  });

  it('extrae JSON de un bloque markdown con lenguaje', () => {
    const content = 'Aquí está el plan:\n```json\n{"planName": "Test"}\n```\nEspero que sirva.';
    expect(parseJSONResponse(content)).toEqual({ planName: 'Test' });
  });

  it('extrae JSON de un bloque markdown sin lenguaje', () => {
    expect(parseJSONResponse('```\n{"a": true}\n```')).toEqual({ a: true });
  });

  it('extrae JSON envuelto en texto suelto usando primer { y último }', () => {
    const content = 'Claro, el resultado es {"a": {"b": 2}} y nada más.';
    expect(parseJSONResponse(content)).toEqual({ a: { b: 2 } });
  });

  it('lanza error si no hay JSON extraíble', () => {
    expect(() => parseJSONResponse('no hay json acá')).toThrow(
      'No se pudo extraer JSON válido'
    );
  });

  it('lanza error si el contenido entre llaves no es JSON válido', () => {
    expect(() => parseJSONResponse('resultado: {a: sin comillas}')).toThrow();
  });
});

describe('callLLM', () => {
  const originalModel = process.env.AI_GATEWAY_MODEL;

  beforeEach(() => {
    generateTextMock.mockReset();
    generateTextMock.mockResolvedValue({
      text: '{"ok": true}',
      usage: { inputTokens: 10, outputTokens: 20 },
    } as never);
    delete process.env.AI_GATEWAY_MODEL;
  });

  afterEach(() => {
    if (originalModel === undefined) delete process.env.AI_GATEWAY_MODEL;
    else process.env.AI_GATEWAY_MODEL = originalModel;
  });

  it('devuelve el contenido y mapea el usage de tokens', async () => {
    const result = await callLLM('sistema', 'prompt');

    expect(result.content).toBe('{"ok": true}');
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 20 });
  });

  it('agrega la instrucción de JSON al system prompt cuando jsonMode está activo (default)', async () => {
    await callLLM('sistema', 'prompt');

    const args = generateTextMock.mock.calls[0][0];
    expect(args.system).toContain('ÚNICAMENTE con JSON válido');
  });

  it('no agrega la instrucción de JSON con jsonMode: false', async () => {
    await callLLM('sistema', 'prompt', { jsonMode: false });

    const args = generateTextMock.mock.calls[0][0];
    expect(args.system).toBe('sistema');
  });

  it('usa el modelo por defecto si AI_GATEWAY_MODEL no está seteado, y la env var si está', async () => {
    await callLLM('s', 'p');
    expect(generateTextMock.mock.calls[0][0].model).toBe('anthropic/claude-sonnet-5');

    process.env.AI_GATEWAY_MODEL = 'openai/gpt-5';
    await callLLM('s', 'p');
    expect(generateTextMock.mock.calls[1][0].model).toBe('openai/gpt-5');
  });

  it('pasa temperature y maxTokens como maxOutputTokens', async () => {
    await callLLM('s', 'p', { temperature: 0.2, maxTokens: 1234 });

    const args = generateTextMock.mock.calls[0][0];
    expect(args.temperature).toBe(0.2);
    expect(args.maxOutputTokens).toBe(1234);
  });

  it('devuelve usage undefined si el proveedor no lo reporta', async () => {
    generateTextMock.mockResolvedValue({ text: 'x', usage: undefined } as never);

    const result = await callLLM('s', 'p');
    expect(result.usage).toBeUndefined();
  });

  it('propaga el error si el LLM falla (p. ej. timeout)', async () => {
    generateTextMock.mockRejectedValue(new Error('The operation was aborted'));

    await expect(callLLM('s', 'p')).rejects.toThrow('aborted');
  });
});
