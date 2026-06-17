import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const roadmap = [
  {
    title: 'Expo Go demo',
    detail: 'Material upload, generated prompts, typed attempts, camera proof, and Reka verdicts.',
    status: 'Ready',
    icon: 'phone-portrait',
  },
  {
    title: 'iOS independent build',
    detail: 'Use a development build for FamilyControls / ManagedSettings integration.',
    status: 'Native',
    icon: 'logo-apple',
  },
  {
    title: 'Android independent build',
    detail: 'Connect to UsageStats and Accessibility service in a custom native module.',
    status: 'Native',
    icon: 'logo-android',
  },
] as const;

const qualityChecks = [
  'Rejects blank or random bypass images',
  'Allows imperfect but visible attempts',
  'Keeps prompt generation separate from proof verification',
  'Documents why Expo Go cannot control Screen Time directly',
];

export default function BuildPlanScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Ionicons name="rocket" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>Final project path</Text>
          <Text style={styles.subtitle}>
            Task Deposit is demo-ready in Expo Go, and the next step for real app blocking is a
            custom native build on iOS and Android.
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Architecture</Text>
          <View style={styles.archRow}>
            <View style={styles.archNode}>
              <Ionicons name="document-text" size={20} color="#2563EB" />
              <Text style={styles.archLabel}>Notes</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#94A3B8" />
            <View style={styles.archNode}>
              <Ionicons name="sparkles" size={20} color="#2563EB" />
              <Text style={styles.archLabel}>Reka</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#94A3B8" />
            <View style={styles.archNode}>
              <Ionicons name="lock-open" size={20} color="#2563EB" />
              <Text style={styles.archLabel}>Unlock</Text>
            </View>
          </View>
        </View>

        <View style={styles.timeline}>
          {roadmap.map((item) => (
            <View key={item.title} style={styles.roadmapCard}>
              <View style={styles.roadmapIcon}>
                <Ionicons name={item.icon} size={21} color="#0F172A" />
              </View>
              <View style={styles.roadmapCopy}>
                <View style={styles.roadmapTitleRow}>
                  <Text style={styles.roadmapTitle}>{item.title}</Text>
                  <Text style={styles.status}>{item.status}</Text>
                </View>
                <Text style={styles.roadmapDetail}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>Judge-facing checks</Text>
          {qualityChecks.map((check) => (
            <View key={check} style={styles.checkRow}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={styles.checkText}>{check}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  header: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    gap: 14,
    padding: 24,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 18,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  subtitle: {
    color: '#DDE7F3',
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  archRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  archNode: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 18,
    gap: 8,
    height: 88,
    justifyContent: 'center',
    width: 88,
  },
  archLabel: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
  },
  timeline: {
    gap: 12,
  },
  roadmapCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 16,
  },
  roadmapIcon: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  roadmapCopy: {
    flex: 1,
    gap: 6,
  },
  roadmapTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  roadmapTitle: {
    color: '#0F172A',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
  roadmapDetail: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  status: {
    backgroundColor: '#EAF2FF',
    borderRadius: 999,
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  checkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  checkText: {
    color: '#334155',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
