import React from 'react';
import { ScrollView, StyleSheet, Text, TextInput } from 'react-native';

import { AccordionCard } from '../components/AccordionCard';
import { SectionCard } from '../components/SectionCard';
import { faqContent } from '../data/faqContent';

export function FaqScreen() {
  const [search, setSearch] = React.useState('');
  const filteredItems = faqContent.filter((item) =>
    `${item.question} ${item.answer}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <SectionCard title="FAQ" caption="자주 발생하는 상황을 질문 중심으로 빠르게 확인할 수 있습니다.">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="그래프, 매핑, 알람, 검사실"
          placeholderTextColor="#7B8A96"
          style={styles.searchInput}
        />
      </SectionCard>

      {filteredItems.map((item) => (
        <AccordionCard key={item.id} title={item.question}>
          <Text style={styles.answerText}>{item.answer}</Text>
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
  answerText: {
    color: '#1F2933',
    fontSize: 14,
    lineHeight: 21,
    padding: 0,
  },
});
