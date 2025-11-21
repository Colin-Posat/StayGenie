import React from 'react';
import { Text as RNText, TextProps, StyleSheet, TextStyle } from 'react-native';

function isBold(weight?: TextStyle['fontWeight']): boolean {
  if (!weight) return false;
  if (weight === 'bold') return true;
  // twrnc often sets "700", sometimes numbers can pass through
  const n = typeof weight === 'string' ? parseInt(weight, 10) : Number(weight);
  return !isNaN(n) && n >= 700;
}

export const Text = (props: TextProps) => {
  const flat = StyleSheet.flatten(props.style) as TextStyle | undefined;
  const weight = flat?.fontWeight;

  const fontFamily = isBold(weight) ? 'Merriweather-Bold' : 'Merriweather-Regular';

  // Put our fontFamily at the **end** so it wins over earlier styles
  return <RNText {...props} style={[props.style, { fontFamily }]} />;
};
