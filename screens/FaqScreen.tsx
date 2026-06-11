import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccordionCard } from '../components/AccordionCard';
import { SectionCard } from '../components/SectionCard';
import { faqContent } from '../data/faqContent';
import { CONTENT_MAX_WIDTH, getScrollPaddingBottom } from '../utils/layout';

export function FaqScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = React.useState('');
  const [qrLoadFailed, setQrLoadFailed] = React.useState(false);

  const filteredItems = faqContent.filter((item) =>
    `${item.question} ${item.answer}`.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const contentContainerStyle = [
    styles.content,
    {
      paddingBottom: getScrollPaddingBottom(insets.bottom),
    },
  ];

  return (
    <ScrollView contentContainerStyle={contentContainerStyle}>
      <SectionCard title="">
        <Text style={styles.contactCardTitle}>People & Technology 고객센터</Text>
        <View style={styles.contactCardRow}>
          <View style={styles.contactInfoList}>
            <View style={styles.contactInfoRow}>
              <Text style={styles.contactInfoLabel}>고객센터</Text>
              <Text style={styles.contactInfoValue}>010-2280-3601</Text>
            </View>
            <View style={styles.contactInfoRow}>
              <Text style={styles.contactInfoLabel}>문의 가능 시간</Text>
              <Text style={styles.contactInfoValue}>09:00 ~ 18:00</Text>
            </View>
          </View>
          <View style={styles.contactQrBlock}>
            {!qrLoadFailed ? (
              <Image
                source={require('../assets/contact/pnt-kakao-qr.png')}
                style={styles.contactQrImage}
                resizeMode="contain"
                onError={() => setQrLoadFailed(true)}
              />
            ) : (
              <View style={styles.contactQrFallback}>
                <Text style={styles.contactQrFallbackText}>카카오톡 QR 이미지 준비 중</Text>
              </View>
            )}
            <Text style={styles.contactQrLabel}>카카오톡 문의</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard title="FAQ">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="병실, 검사실, 라이브스튜디오, EMR, 알람, QR"
          placeholderTextColor="#7B8A96"
          style={styles.searchInput}
        />
      </SectionCard>

      {filteredItems.map((item) => (
        <AccordionCard key={item.id} title={item.question}>
          <Text style={styles.answerText}>A. {item.answer}</Text>
        </AccordionCard>
      ))}
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
  answerText: {
    color: '#1F2933',
    fontSize: 14,
    lineHeight: 21,
  },
  contactCardTitle: {
    color: '#1F2933',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 27,
  },
  contactCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  contactInfoList: {
    flex: 1,
    minWidth: 180,
    gap: 10,
  },
  contactInfoRow: {
    gap: 4,
  },
  contactInfoLabel: {
    color: '#52616B',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  contactInfoValue: {
    color: '#1F2933',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  contactQrBlock: {
    alignItems: 'center',
    gap: 8,
  },
  contactQrImage: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#F4F8FA',
  },
  contactQrFallback: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#F4F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  contactQrFallbackText: {
    color: '#52616B',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },
  contactQrLabel: {
    color: '#52616B',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
});
