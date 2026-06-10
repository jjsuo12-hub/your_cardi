import React from 'react';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { useFonts } from 'expo-font';

import { FaqScreen } from './screens/FaqScreen';
import { HicardiCriteriaScreen } from './screens/HicardiCriteriaScreen';
import { ManualScreen } from './screens/ManualScreen';

type Tab = 'criteria' | 'manual' | 'faq';

const theme = {
  primary: '#1E5B8C',
  secondary: '#2BAE9E',
  background: '#F4F8FA',
  card: '#FFFFFF',
  text: '#1F2933',
  muted: '#52616B',
};

const customFontAssets = {};
const appFontFamily =
  Platform.OS === 'web'
    ? 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    : Platform.OS === 'ios'
      ? 'System'
      : 'sans-serif';

function applyDefaultTypography() {
  const defaultStyle = { fontFamily: appFontFamily, letterSpacing: 0 };
  const textComponent = Text as unknown as { defaultProps?: { style?: unknown } };
  const inputComponent = TextInput as unknown as { defaultProps?: { style?: unknown } };
  textComponent.defaultProps = textComponent.defaultProps ?? {};
  inputComponent.defaultProps = inputComponent.defaultProps ?? {};
  textComponent.defaultProps.style = [defaultStyle, textComponent.defaultProps.style];
  inputComponent.defaultProps.style = [defaultStyle, inputComponent.defaultProps.style];
}

applyDefaultTypography();

export default function App() {
  const [fontsLoaded] = useFonts(customFontAssets);
  const [tab, setTab] = React.useState<Tab>('criteria');

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.appShell}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>YOUR_Cardi</Text>
          <Text style={styles.headerSubtitle}>HiCardi 적용 기준 확인을 보조하는 병동 실무용 경량 버전</Text>
        </View>

        {tab === 'criteria' ? <HicardiCriteriaScreen /> : null}
        {tab === 'manual' ? <ManualScreen /> : null}
        {tab === 'faq' ? <FaqScreen /> : null}

        <BottomTabs active={tab} onChange={setTab} />
      </View>
    </SafeAreaView>
  );
}

function BottomTabs({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  const tabs: { id: Tab; label: string }[] = [
    { id: 'criteria', label: '적용 기준' },
    { id: 'manual', label: '매뉴얼' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <View style={styles.tabBar}>
      {tabs.map((tab) => (
        <Pressable key={tab.id} style={[styles.tabButton, active === tab.id && styles.tabButtonActive]} onPress={() => onChange(tab.id)}>
          <View style={styles.tabInner}>
            <TabIcon tab={tab.id} active={active === tab.id} />
            <Text style={[styles.tabText, active === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function TabIcon({ tab, active }: { tab: Tab; active: boolean }) {
  const color = active ? '#FFFFFF' : theme.primary;

  if (tab === 'criteria') {
    return (
      <Svg width="24" height="24" viewBox="0 0 24 24">
        <Rect x="5" y="4" width="14" height="16" rx="2" stroke={color} strokeWidth="2" fill="none" />
        <Line x1="8" y1="9" x2="16" y2="9" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Line x1="8" y1="13" x2="14" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round" />
        <Path d="M8 16.2 9.8 18 13.5 14.4" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  }

  if (tab === 'manual') {
    return (
      <Svg width="24" height="24" viewBox="0 0 24 24">
        <Path d="M6 5.5h6.5a3 3 0 0 1 3 3V18H9a3 3 0 0 0-3 3Z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
        <Path d="M18 5.5h-5.5a3 3 0 0 0-3 3V18H15a3 3 0 0 1 3 3Z" stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" />
      </Svg>
    );
  }

  return (
    <Svg width="24" height="24" viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="2" stroke={color} strokeWidth="2" fill="none" />
      <Path d="M6 18c1.5-3 4.1-4.5 6-4.5S16.5 15 18 18" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
      <Path d="M18 9.5h2M21 9.5h-2M19.5 8v3" stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.background,
  },
  appShell: {
    flex: 1,
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    backgroundColor: theme.background,
  },
  header: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: '#DCECF5',
    fontSize: 12,
    lineHeight: 18,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: theme.background,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B8D3E5',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tabButtonActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  tabInner: {
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    color: theme.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});
