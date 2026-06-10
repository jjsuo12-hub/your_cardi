import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title?: string;
  caption?: string;
  children: React.ReactNode;
};

export function SectionCard({ title, caption, children }: Props) {
  return (
    <View style={styles.card}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    padding: 16,
    gap: 12,
  },
  title: {
    color: '#1F2933',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 24,
  },
  caption: {
    color: '#52616B',
    fontSize: 12,
    lineHeight: 18,
  },
});
