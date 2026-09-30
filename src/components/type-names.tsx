import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import type { ClassType } from "@/lib/schedule";
import { spacing } from "@/lib/theme";

const DOT = 8;

/** A class's type names, each after its colour dot, as the web schedule shows them. */
export function TypeNames({
  types,
  style,
}: {
  types: ClassType[];
  style: StyleProp<TextStyle>;
}) {
  if (types.length === 0) return <Text style={style}>Μάθημα</Text>;

  return (
    <View style={styles.names}>
      {types.map((t) => (
        <View key={t.id} style={styles.name}>
          <Dot color={t.color_hex} />
          <Text style={style}>{t.name}</Text>
        </View>
      ))}
    </View>
  );
}

/** A class's type colours as a row of dots. */
export function TypeDots({ types }: { types: ClassType[] }) {
  return (
    <View style={styles.dots}>
      {types.map((t) => (
        <Dot key={t.id} color={t.color_hex} />
      ))}
    </View>
  );
}

function Dot({ color }: { color: string | null }) {
  return <View style={[styles.dot, { backgroundColor: color ?? "transparent" }]} />;
}

const styles = StyleSheet.create({
  names: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md, rowGap: 2 },
  name: { flexDirection: "row", alignItems: "center", gap: 6 },
  dots: { flexDirection: "row", gap: 3 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
