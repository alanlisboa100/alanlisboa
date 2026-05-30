import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { theme } from "../theme";

const MONO = Platform.select({ ios: "Courier", default: "monospace" });

/**
 * A small, dependency-free Markdown renderer covering the subset that chat
 * answers actually use: headings, bold, italic, inline code, code blocks,
 * bullet and numbered lists, blockquotes and paragraphs.
 */

interface Seg {
  text: string;
  bold?: boolean;
  italic?: boolean;
  code?: boolean;
}

function parseInline(input: string): Seg[] {
  const segs: Seg[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(input)) !== null) {
    if (m.index > last) segs.push({ text: input.slice(last, m.index) });
    if (m[2] !== undefined) segs.push({ text: m[2], bold: true });
    else if (m[3] !== undefined) segs.push({ text: m[3], italic: true });
    else if (m[4] !== undefined) segs.push({ text: m[4], code: true });
    last = m.index + m[0].length;
  }
  if (last < input.length) segs.push({ text: input.slice(last) });
  return segs.length ? segs : [{ text: input }];
}

function Inline({ text, color }: { text: string; color: string }) {
  return (
    <>
      {parseInline(text).map((s, i) => (
        <Text
          key={i}
          style={[
            { color },
            s.bold && styles.bold,
            s.italic && styles.italic,
            s.code && styles.inlineCode,
          ]}
        >
          {s.text}
        </Text>
      ))}
    </>
  );
}

function headingStyle(level: number) {
  if (level <= 1) return styles.h1;
  if (level === 2) return styles.h2;
  if (level === 3) return styles.h3;
  return styles.h4;
}

export function Markdown({ text, color }: { text: string; color: string }) {
  const blocks: React.ReactNode[] = [];
  let key = 0;

  try {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    let i = 0;
    let listItems: React.ReactNode[] = [];

    const flushList = () => {
      if (listItems.length) {
        blocks.push(
          <View key={`l${key++}`} style={styles.list}>
            {listItems}
          </View>,
        );
        listItems = [];
      }
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (/^```/.test(trimmed)) {
        flushList();
        const buf: string[] = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i].trim())) {
          buf.push(lines[i]);
          i++;
        }
        i++; // skip closing fence
        blocks.push(
          <View key={`c${key++}`} style={styles.codeBlock}>
            <Text style={styles.codeText}>{buf.join("\n")}</Text>
          </View>,
        );
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        flushList();
        const level = heading[1].length;
        blocks.push(
          <Text key={`h${key++}`} style={[headingStyle(level), { color }]}>
            <Inline text={heading[2]} color={color} />
          </Text>,
        );
        i++;
        continue;
      }

      const quote = line.match(/^\s*>\s?(.*)$/);
      if (quote) {
        flushList();
        blocks.push(
          <View key={`q${key++}`} style={styles.quote}>
            <Text style={[styles.p, { color: theme.colors.textDim }]}>
              <Inline text={quote[1]} color={theme.colors.textDim} />
            </Text>
          </View>,
        );
        i++;
        continue;
      }

      const bullet = line.match(/^\s*[-*]\s+(.*)$/);
      if (bullet) {
        listItems.push(
          <View key={`b${key++}`} style={styles.li}>
            <Text style={[styles.marker, { color }]}>•</Text>
            <Text style={[styles.liText, { color }]}>
              <Inline text={bullet[1]} color={color} />
            </Text>
          </View>,
        );
        i++;
        continue;
      }

      const ordered = line.match(/^\s*(\d+)\.\s+(.*)$/);
      if (ordered) {
        listItems.push(
          <View key={`o${key++}`} style={styles.li}>
            <Text style={[styles.marker, { color }]}>{ordered[1]}.</Text>
            <Text style={[styles.liText, { color }]}>
              <Inline text={ordered[2]} color={color} />
            </Text>
          </View>,
        );
        i++;
        continue;
      }

      if (!trimmed) {
        flushList();
        i++;
        continue;
      }

      flushList();
      blocks.push(
        <Text key={`p${key++}`} style={[styles.p, { color }]}>
          <Inline text={line} color={color} />
        </Text>,
      );
      i++;
    }
    flushList();
  } catch {
    return <Text style={[styles.p, { color }]}>{text}</Text>;
  }

  return <View>{blocks}</View>;
}

const styles = StyleSheet.create({
  bold: { fontWeight: "800" },
  italic: { fontStyle: "italic" },
  inlineCode: {
    fontFamily: MONO,
    backgroundColor: theme.colors.surfaceAlt,
  },
  p: { fontSize: 15, lineHeight: 21, marginBottom: 4 },
  h1: { fontSize: 20, fontWeight: "800", marginTop: 4, marginBottom: 4 },
  h2: { fontSize: 18, fontWeight: "800", marginTop: 4, marginBottom: 4 },
  h3: { fontSize: 16, fontWeight: "700", marginTop: 4, marginBottom: 3 },
  h4: { fontSize: 15, fontWeight: "700", marginTop: 4, marginBottom: 3 },
  list: { marginVertical: 2 },
  li: { flexDirection: "row", marginBottom: 3, paddingRight: 8 },
  marker: { width: 22, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  liText: { flex: 1, fontSize: 15, lineHeight: 21 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    paddingLeft: 10,
    marginVertical: 4,
  },
  codeBlock: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.sm,
    padding: 10,
    marginVertical: 6,
  },
  codeText: {
    fontFamily: MONO,
    fontSize: 13,
    color: theme.colors.text,
  },
});
