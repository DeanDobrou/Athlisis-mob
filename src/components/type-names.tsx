import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
} from "react-native";

import type { ClassType } from "@/lib/contract";
import { spacing } from "@/lib/theme";

const DOT = 8;

/** A class's type names, each after its colour dot, as the web schedule shows them. */
export function TypeNames({
  types,
  stacked = false,
  style,
}: {
  types: ClassType[];
  /** One name per line, rather than side by side as they fit. */
  stacked?: boolean;
  style: StyleProp<TextStyle>;
}) {
  if (types.length === 0) return <Text style={style}>Μάθημα</Text>;

  return (
    <View style={[styles.names, stacked && styles.stacked]}>
      {types.map((t) => (
        <View key={t.id} style={styles.name}>
          <Dot color={t.color_hex} />
          <Text style={[styles.text, style]}>{t.name}</Text>
        </View>
      ))}
    </View>
  );
}

function Dot({ color }: { color: string | null }) {
  return <View style={[styles.dot, { backgroundColor: color ?? "transparent" }]} />;
}

const styles = StyleSheet.create({
  names: { flexDirection: "row", flexWrap: "wrap", columnGap: spacing.md, rowGap: 2 },
  stacked: { flexDirection: "column" },
  name: { flexDirection: "row", alignItems: "center", gap: 6 },
  // A long name wraps beside its dot rather than running out of the row.
  text: { flexShrink: 1 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
