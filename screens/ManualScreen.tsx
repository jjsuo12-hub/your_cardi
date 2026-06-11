import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccordionCard } from '../components/AccordionCard';
import { ManualImage } from '../components/ManualImage';
import { SectionCard } from '../components/SectionCard';
import { manualContent } from '../data/manualContent';
import { manualImageAssets } from '../data/manualImageAssets';
import { CONTENT_MAX_WIDTH, getScrollPaddingBottom } from '../utils/layout';

export function ManualScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = React.useState('');
  const [activeTabs, setActiveTabs] = React.useState<Record<string, string>>({
    step2: 'pc',
    step4: 'smart-web',
    step5: 'pc',
  });

  const filteredItems = manualContent.filter((item) => {
    const haystack = [
      item.title,
      item.summary,
      ...item.sections.flatMap((section) => [section.title ?? '', ...section.body, section.warning ?? '']),
      ...(item.tabs?.flatMap((tab) => [tab.label, ...tab.body, tab.warning ?? '']) ?? []),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(search.trim().toLowerCase());
  });

  const contentContainerStyle = [
    styles.content,
    {
      paddingBottom: getScrollPaddingBottom(insets.bottom),
    },
  ];

  return (
    <ScrollView contentContainerStyle={contentContainerStyle}>
      <SectionCard title="매뉴얼">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="준비, 매핑, 적용, 모니터링, 종료"
          placeholderTextColor="#7B8A96"
          style={styles.searchInput}
        />
      </SectionCard>

      {filteredItems.map((item) => {
        const activeTab = item.tabs?.find((tab) => tab.id === (activeTabs[item.id] ?? item.tabs?.[0]?.id)) ?? item.tabs?.[0];
        const sectionImageSources = item.sections.map((section) => (section.image ? manualImageAssets[section.image] : undefined));
        const activeTabImageSource = activeTab?.image ? manualImageAssets[activeTab.image] : undefined;

        return (
          <AccordionCard key={item.id} title={item.title} summary={item.summary}>
            {item.sections.map((section, index) => (
              <View key={`${item.id}-section-${index}`} style={styles.block}>
                {section.title ? <Text style={styles.blockTitle}>{section.title}</Text> : null}
                {section.body.map((line) => (
                  <Text key={`${item.id}-${line}`} style={styles.blockText}>
                    {line}
                  </Text>
                ))}
                {section.image && sectionImageSources[index] ? <ManualImage imageKey={section.image} source={sectionImageSources[index]} /> : null}
                {section.warning ? <Text style={styles.warningText}>주의: {section.warning}</Text> : null}
              </View>
            ))}

            {item.tabs && activeTab ? (
              <View style={styles.block}>
                <View style={styles.tabRow}>
                  {item.tabs.map((tab) => (
                    <Pressable
                      key={`${item.id}-${tab.id}`}
                      style={[styles.tabButton, activeTabs[item.id] === tab.id && styles.tabButtonActive]}
                      onPress={(event) => {
                        event.stopPropagation?.();
                        setActiveTabs((current) => ({ ...current, [item.id]: tab.id }));
                      }}
                    >
                      <Text style={[styles.tabButtonText, activeTabs[item.id] === tab.id && styles.tabButtonTextActive]}>{tab.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {activeTab.body.map((line) => (
                  <Text key={`${item.id}-${line}`} style={styles.blockText}>
                    {line}
                  </Text>
                ))}
                {activeTab.image && activeTabImageSource ? <ManualImage imageKey={activeTab.image} source={activeTabImageSource} /> : null}
                {activeTab.warning ? <Text style={styles.warningText}>안내: {activeTab.warning}</Text> : null}
              </View>
            ) : null}
          </AccordionCard>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
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
  block: {
    gap: 8,
  },
  blockTitle: {
    color: '#1F2933',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
  },
  blockText: {
    color: '#1F2933',
    fontSize: 14,
    lineHeight: 21,
  },
  warningText: {
    color: '#8A5A00',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  tabButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    backgroundColor: '#EAF3F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tabButtonActive: {
    borderColor: '#1E5B8C',
    backgroundColor: '#1E5B8C',
  },
  tabButtonText: {
    color: '#1E5B8C',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
});
