import React from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  title: string;
  summary?: string;
  children: React.ReactNode;
};

export function AccordionCard({ title, summary, children }: Props) {
  const [expanded, setExpanded] = React.useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((current) => !current);
  };

  return (
    <View style={[styles.card, expanded && styles.cardExpanded]}>
      <Pressable style={styles.header} onPress={toggle}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {summary ? <Text style={styles.summary}>{summary}</Text> : null}
        </View>
        <Text style={styles.chevron}>{expanded ? '⌃' : '⌄'}</Text>
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    overflow: 'hidden',
  },
  cardExpanded: {
    borderColor: '#B8D3E5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  summary: {
    color: '#52616B',
    fontSize: 12,
    lineHeight: 18,
  },
  chevron: {
    color: '#1E5B8C',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 22,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
});
