import { randomUUID } from 'crypto';
import type { StudioNode } from './studioDocument';

export const studioParagraph = (
  content: StudioNode[],
  textAlign: string | null = null,
): StudioNode => ({ type: 'paragraph', attrs: { blockId: randomUUID(), textAlign }, content });
export const studioTextNode = (text: string): StudioNode => ({ type: 'text', text });
