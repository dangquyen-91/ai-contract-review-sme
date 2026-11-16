import type { ReactNode } from 'react';
import styles from '@/styles/contract-document.module.css';

export function ContractDocument({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith('| ') || line.includes('\t')) {
      const signature = line.includes('\t');
      const rows: string[][] = [];
      const start = index;
      while (index < lines.length && (signature ? lines[index].includes('\t') : lines[index].startsWith('| '))) {
        rows.push(signature ? lines[index].split('\t') : lines[index].replace(/^\|\s*|\s*\|$/g, '').split('|').map(cell => cell.trim()));
        index++;
      }
      index--;
      blocks.push(signature ? <table key={start} className={styles.signatures}><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, column) => <td key={column}>{rowIndex === 0 ? <strong>{cell}</strong> : rowIndex === 1 ? <em>{cell}</em> : cell || '\u00a0'}</td>)}</tr>)}</tbody></table> : <div key={start} className={styles.tableWrap}><table className={styles.items}><thead><tr>{rows[0].map((cell, column) => <th key={column}>{cell}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>);
    } else {
      const heading = index === 0 || index === 3 || /^(ĐIỀU \d+\.|BÊN [AB] -)/.test(line);
      blocks.push(<p key={index} className={`whitespace-pre-wrap break-words ${index < 5 ? 'text-center' : ''} ${heading ? `${styles.heading} font-bold` : ''} ${index === 1 ? 'italic' : ''}`}>{line || '\u00a0'}</p>);
    }
  }
  return <div className={styles.document}>{blocks}</div>;
}
