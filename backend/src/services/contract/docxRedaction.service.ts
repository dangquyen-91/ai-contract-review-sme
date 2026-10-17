import JSZip from 'jszip';
import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import { AppError } from '../../errors/AppError';
import { createRedactor, SensitiveDataType } from '../ai/redaction.service';

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const WORD_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const XML_NS = 'http://www.w3.org/XML/1998/namespace';
const allowedPart =
  /^(?:\[Content_Types\]\.xml|_rels\/\.rels|word\/(?:document|styles|settings|webSettings|fontTable|numbering|footnotes|endnotes|header\d*|footer\d*)\.xml|word\/theme\/[^/]+\.xml|word\/_rels\/[^/]+\.rels)$/;
const omittedPart = /^(?:docProps\/|customXml\/|word\/comments|word\/people)/;

function parseXml(xml: string) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml))
    throw AppError.badRequest('Unsupported DOCX XML declarations');
  return new DOMParser({
    errorHandler: () => {
      throw AppError.badRequest('Invalid DOCX XML');
    },
  }).parseFromString(xml, 'application/xml');
}

/** Produces a separate reading copy. Never modifies the uploaded buffer or stored file. */
export async function redactDocx(
  buffer: Buffer,
  extractedText: string,
  policy: SensitiveDataType[],
): Promise<Buffer> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw AppError.badRequest('Invalid DOCX file');
  }
  if (!zip.file('word/document.xml')) throw AppError.badRequest('Invalid DOCX document');

  const files = Object.values(zip.files).filter((entry) => !entry.dir);
  let expandedSize = 0;
  for (const entry of files) {
    const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data
      ?.uncompressedSize;
    if (size === undefined || size > 8 * 1024 * 1024 || (expandedSize += size) > 40 * 1024 * 1024) {
      throw AppError.badRequest('DOCX is too complex for a redacted preview');
    }
    if (!allowedPart.test(entry.name) && !omittedPart.test(entry.name)) {
      // Images, embedded documents and alternative HTML can carry uninspectable data.
      throw AppError.badRequest(
        'This DOCX contains images or embedded content. Use the redacted text view instead.',
      );
    }
  }

  const parts = await Promise.all(
    files
      .filter((entry) => allowedPart.test(entry.name))
      .map(async (entry) => {
        const document = parseXml(await entry.async('string'));
        if (
          entry.name === 'word/document.xml' &&
          (document.documentElement.namespaceURI !== WORD_NS ||
            document.documentElement.localName !== 'document')
        ) {
          throw AppError.badRequest('Invalid DOCX document root');
        }
        if (
          Array.from(document.getElementsByTagNameNS('*', 't')).some(
            (node) => node.namespaceURI !== WORD_NS,
          )
        ) {
          throw AppError.badRequest(
            'DOCX contains unsupported drawing or equation text. Use the redacted text view instead.',
          );
        }
        // Remove hidden revision content and fields, comments, and personal editing attributes.
        for (const tag of [
          'del',
          'delText',
          'instrText',
          'docVars',
          'commentRangeStart',
          'commentRangeEnd',
          'commentReference',
        ]) {
          const nodes = Array.from(document.getElementsByTagNameNS(WORD_NS, tag));
          for (const node of nodes) node.parentNode?.removeChild(node);
        }
        const stack = [document as typeof document | typeof document.documentElement];
        while (stack.length) {
          const node = stack.pop()!;
          for (const child of Array.from(node.childNodes)) {
            if (child.nodeType === 8 || child.nodeType === 7) node.removeChild(child);
            else if (child.nodeType === 1) stack.push(child as typeof document.documentElement);
            else if (
              child.nodeType === 3 &&
              child.textContent?.trim() &&
              !(
                node.nodeType === 1 &&
                (node as typeof document.documentElement).namespaceURI === WORD_NS &&
                (node as typeof document.documentElement).localName === 't'
              )
            ) {
              throw AppError.badRequest(
                'DOCX contains unsupported text content. Use the redacted text view instead.',
              );
            }
          }
        }
        for (const element of Array.from(document.getElementsByTagName('*'))) {
          for (const attribute of Array.from(element.attributes)) {
            if (
              ['author', 'initials', 'date', 'instr'].includes(attribute.localName ?? '') ||
              attribute.localName?.startsWith('rsid')
            ) {
              element.removeAttributeNode(attribute);
            }
          }
        }
        const paragraphs = Array.from(document.getElementsByTagNameNS(WORD_NS, 'p')).map(
          (paragraph) => {
            const nodes = Array.from(paragraph.getElementsByTagNameNS(WORD_NS, 't')).filter(
              (node) => {
                let parent = node.parentNode;
                while (
                  parent &&
                  parent !== paragraph &&
                  !(parent.nodeType === 1 && parent.nodeName.split(':').at(-1) === 'p')
                )
                  parent = parent.parentNode;
                return parent === paragraph;
              },
            );
            for (const node of nodes) node.textContent = (node.textContent ?? '').normalize('NFC');
            const text = nodes.map((node) => node.textContent ?? '').join('');
            if (text !== text.normalize('NFC'))
              throw AppError.badRequest(
                'DOCX has combining characters split across runs. Use the redacted text view instead.',
              );
            return { nodes, text };
          },
        );
        return { name: entry.name, document, paragraphs };
      }),
  );
  const source = [
    ...parts.flatMap((part) => part.paragraphs.map((paragraph) => paragraph.text)),
    ...parts.flatMap((part) =>
      Array.from(part.document.getElementsByTagName('*')).flatMap((element) =>
        Array.from(element.attributes).map((attribute) => attribute.value),
      ),
    ),
    extractedText.normalize('NFC'),
  ].join('\n');
  const redactor = createRedactor(source, policy);

  for (const part of parts) {
    for (const { nodes, text } of part.paragraphs) {
      const masked = redactor.maskWithOffsets(text);
      const replacements = [...masked.masked.matchAll(/\[[A-Z_]+_\d+\]/g)]
        .map((match) => ({
          start: masked.toOriginalOffset(match.index!),
          end: masked.toOriginalOffset(match.index! + match[0].length),
          value: redactor.maskForDisplay(redactor.unmask(match[0])).text,
        }))
        .filter((replacement) => replacement.end > replacement.start);
      let offset = 0;
      for (const node of nodes) {
        const value = node.textContent ?? '';
        const start = offset;
        offset += value.length;
        let shown = value;
        for (const replacement of [...replacements].reverse()) {
          if (replacement.end <= start || replacement.start >= offset) continue;
          shown =
            shown.slice(0, Math.max(0, replacement.start - start)) +
            (replacement.start >= start ? replacement.value : '') +
            shown.slice(Math.min(value.length, replacement.end - start));
        }
        node.textContent = shown;
        node.setAttributeNS(XML_NS, 'xml:space', 'preserve');
      }
    }
    for (const element of Array.from(part.document.getElementsByTagName('*'))) {
      for (const attribute of Array.from(element.attributes)) {
        if (attribute.localName !== 'xmlns' && attribute.prefix !== 'xmlns')
          attribute.value = redactor.maskForDisplay(attribute.value).text;
      }
      if (element.localName === 'Relationship') {
        const target = element.getAttribute('Target') ?? '';
        const type = element.getAttribute('Type') ?? '';
        if (
          element.getAttribute('TargetMode') === 'External' ||
          /comments|people|customXml|metadata|properties/i.test(type + target)
        )
          element.parentNode?.removeChild(element);
      }
      if (
        element.localName === 'Override' &&
        omittedPart.test((element.getAttribute('PartName') ?? '').replace(/^\//, ''))
      )
        element.parentNode?.removeChild(element);
    }
  }
  const result = new JSZip();
  const serializer = new XMLSerializer();
  for (const part of parts) result.file(part.name, serializer.serializeToString(part.document));
  return result.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
