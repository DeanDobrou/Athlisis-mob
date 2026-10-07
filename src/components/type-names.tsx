import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

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

/** A class's type colours as a bar, one segment per type. */
export function TypeBar({ types, style }: { types: ClassType[]; style: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.bar, style]}>
      {types.map((t) => (
        <View key={t.id} style={[styles.segment, { backgroundColor: t.color_hex ?? "transparent" }]} />
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
  bar: { flexDirection: "row", gap: 2 },
  segment: { flex: 1, borderRadius: 3 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
