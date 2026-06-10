import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { AccordionCard } from '../components/AccordionCard';
import { SectionCard } from '../components/SectionCard';
import { manualItems } from '../data/manualContent';

export function ManualScreen() {
  const [search, setSearch] = React.useState('');
  const filteredItems = manualItems.filter((item) =>
    `${item.title} ${item.summary} ${item.steps.join(' ')}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="매뉴얼" caption="병동에서 바로 확인할 수 있도록 핵심 절차만 간단히 정리했습니다.">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="준비, 매핑, 적용, 종료"
          placeholderTextColor="#7B8A96"
          style={styles.searchInput}
        />
      </SectionCard>

      {filteredItems.map((item) => (
        <AccordionCard key={item.id} title={item.title} summary={item.summary}>
          <View style={styles.stepList}>
            {item.steps.map((step, index) => (
              <Text key={`${item.id}-${index}`} style={styles.stepText}>
                {index + 1}. {step}
              </Text>
            ))}
          </View>
        </AccordionCard>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
  },
  searchInput: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D6E2E8',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1F2933',
  },
  stepList: {
    gap: 8,
  },
  stepText: {
    color: '#1F2933',
    fontSize: 14,
    lineHeight: 21,
  },
});
