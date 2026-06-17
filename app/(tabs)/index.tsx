import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const API_BASE_URL = 'https://taskdeposit-summerbuild.onrender.com';

type AppScreen = 'dashboard' | 'challenge' | 'camera' | 'unlocked';
type AttemptStatus = 'idle' | 'accepted' | 'rejected';

type BlockedApp = {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  minutes: number;
};

const blockedApps: BlockedApp[] = [
  { name: 'Instagram', icon: 'logo-instagram', color: '#D94674', minutes: 15 },
  { name: 'TikTok', icon: 'musical-notes', color: '#111827', minutes: 12 },
  { name: 'YouTube', icon: 'logo-youtube', color: '#EF4444', minutes: 10 },
  { name: 'Games', icon: 'game-controller', color: '#2563EB', minutes: 20 },
];

const fallbackTasks = [
  'Explain the role of NADH in the Krebs cycle in three sentences.',
  'Solve: 3x + 7 = 31, and show each algebra step.',
  'Draw a labeled flow of glycolysis into the Krebs cycle.',
];

const recentDeposits = [
  { title: 'Cell respiration sketch', verdict: 'Accepted', time: 'Today' },
  { title: 'Quadratic practice', verdict: 'Accepted', time: 'Yesterday' },
  { title: 'Blank page photo', verdict: 'Rejected', time: 'Yesterday' },
];

function cleanModelJson(value: string) {
  return value.replace(/```json|```/g, '').trim();
}

function extractQuestions(raw: unknown) {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof raw !== 'string') {
    return [];
  }

  try {
    const parsed = JSON.parse(cleanModelJson(raw));
    return extractQuestions(parsed);
  } catch {
    return raw
      .split(/\n+/)
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 5);
  }
}

function looksLikeAttempt(answer: string) {
  const words = answer.trim().split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words.map((word) => word.toLowerCase()));
  const repeatedCharacter = /(.)\1{5,}/.test(answer);

  return answer.trim().length >= 24 && words.length >= 5 && uniqueWords.size >= 4 && !repeatedCharacter;
}

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [screen, setScreen] = useState<AppScreen>('dashboard');
  const [selectedApp, setSelectedApp] = useState(blockedApps[0]);
  const [activeTask, setActiveTask] = useState(fallbackTasks[0]);
  const [typedAnswer, setTypedAnswer] = useState('');
  const [materialName, setMaterialName] = useState('Krebs cycle lecture notes.pdf');
  const [isUploadingMaterial, setIsUploadingMaterial] = useState(false);
  const [isSubmittingPhoto, setIsSubmittingPhoto] = useState(false);
  const [attemptStatus, setAttemptStatus] = useState<AttemptStatus>('idle');
  const [feedback, setFeedback] = useState('Upload notes to generate a fresh lock-screen challenge.');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const completionRate = useMemo(() => {
    const accepted = recentDeposits.filter((deposit) => deposit.verdict === 'Accepted').length;
    return Math.round((accepted / recentDeposits.length) * 100);
  }, []);

  const uploadMaterial = async () => {
    try {
      const fileResult = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: ['application/pdf', 'text/plain', 'image/*'],
      });

      if (fileResult.canceled) {
        return;
      }

      setIsUploadingMaterial(true);
      const file = fileResult.assets[0];
      setMaterialName(file.name);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType ?? 'application/octet-stream',
      } as any);

      const response = await fetch(`${API_BASE_URL}/generate-tasks`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = await response.json();

      if (result.status === 'success') {
        const questions = extractQuestions(result.questions);
        const nextTask = questions[0] ?? fallbackTasks[0];
        setActiveTask(nextTask);
        setFeedback('New challenge generated from your material.');
      } else {
        setActiveTask(fallbackTasks[1]);
        setFeedback(result.message ?? 'Using a demo challenge until the backend is ready.');
      }
    } catch (error) {
      console.error(error);
      setActiveTask(fallbackTasks[2]);
      setFeedback('Could not reach the AI task generator, so a demo challenge is loaded.');
    } finally {
      setIsUploadingMaterial(false);
    }
  };

  const openBlockedApp = (app: BlockedApp) => {
    setSelectedApp(app);
    setAttemptStatus('idle');
    setTypedAnswer('');
    setPhotoPreview(null);
    setFeedback(`${app.name} is locked. Deposit a real learning attempt to continue.`);
    setScreen('challenge');
  };

  const submitTypedAnswer = () => {
    if (looksLikeAttempt(typedAnswer)) {
      setAttemptStatus('accepted');
      setFeedback('Typed response accepted as a real attempt.');
      setScreen('unlocked');
      return;
    }

    setAttemptStatus('rejected');
    setFeedback('That looks too short or repetitive. Add a real explanation, steps, or working.');
  };

  const submitPhotoAnswer = async () => {
    if (!cameraRef.current) {
      return;
    }

    try {
      setIsSubmittingPhoto(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.75 });
      setPhotoPreview(photo.uri);

      const formData = new FormData();
      formData.append('file', {
        uri: photo.uri,
        name: 'task-deposit-proof.jpg',
        type: 'image/jpeg',
      } as any);
      formData.append('task', activeTask);

      const response = await fetch(`${API_BASE_URL}/upload-task`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = await response.json();
      const aiData = JSON.parse(cleanModelJson(result.message));

      if (aiData.valid === true) {
        setAttemptStatus('accepted');
        setFeedback(aiData.reason ?? 'Photo accepted as a real attempt.');
        setScreen('unlocked');
      } else {
        setAttemptStatus('rejected');
        setFeedback(aiData.reason ?? 'The image did not look like a real attempt.');
        setScreen('challenge');
      }
    } catch (error) {
      console.error(error);
      setAttemptStatus('rejected');
      setFeedback('Photo review failed. Check the backend connection and try again.');
      setScreen('challenge');
    } finally {
      setIsSubmittingPhoto(false);
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const nextPermission = await requestPermission();
      if (!nextPermission.granted) {
        Alert.alert('Camera needed', 'Task Deposit needs the camera for handwritten proof uploads.');
        return;
      }
    }

    setScreen('camera');
  };

  if (screen === 'camera') {
    return (
      <View style={styles.cameraScreen}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <SafeAreaView style={styles.cameraOverlay}>
            <View style={styles.cameraTopBar}>
              <Pressable style={styles.iconButtonLight} onPress={() => setScreen('challenge')}>
                <Ionicons name="close" size={22} color="#F8FAFC" />
              </Pressable>
              <View style={styles.cameraTaskPill}>
                <Text numberOfLines={1} style={styles.cameraTaskText}>
                  {activeTask}
                </Text>
              </View>
            </View>
            <View style={styles.captureBar}>
              <Pressable
                disabled={isSubmittingPhoto}
                style={({ pressed }) => [styles.captureButton, pressed && styles.pressed]}
                onPress={submitPhotoAnswer}>
                {isSubmittingPhoto ? (
                  <ActivityIndicator color="#0F172A" />
                ) : (
                  <Ionicons name="camera" size={30} color="#0F172A" />
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  if (screen === 'unlocked') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successWrap}>
          <View style={[styles.unlockHalo, { backgroundColor: selectedApp.color }]}>
            <Ionicons name="lock-open" size={36} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>{selectedApp.name} unlocked</Text>
          <Text style={styles.successText}>
            You earned {selectedApp.minutes} focused minutes. The demo shows the flow that a native
            Screen Time / app-blocking build would trigger.
          </Text>
          <View style={styles.receipt}>
            <View>
              <Text style={styles.receiptLabel}>Challenge</Text>
              <Text style={styles.receiptText}>{activeTask}</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View>
              <Text style={styles.receiptLabel}>AI gate</Text>
              <Text style={styles.receiptText}>{feedback}</Text>
            </View>
          </View>
          <Pressable style={styles.primaryButton} onPress={() => setScreen('dashboard')}>
            <Ionicons name="home" size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Back to dashboard</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'challenge') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.challengeContent} showsVerticalScrollIndicator={false}>
          <View style={styles.challengeHeader}>
            <Pressable style={styles.iconButton} onPress={() => setScreen('dashboard')}>
              <Ionicons name="chevron-back" size={22} color="#0F172A" />
            </Pressable>
            <View style={[styles.appBadge, { backgroundColor: selectedApp.color }]}>
              <Ionicons name={selectedApp.icon} size={22} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.lockedTitle}>{selectedApp.name} is paused</Text>
          <Text style={styles.lockedSubtitle}>
            Deposit a real attempt before the scroll timer opens.
          </Text>

          <View style={styles.promptPanel}>
            <View style={styles.panelHeader}>
              <Ionicons name="school" size={18} color="#2563EB" />
              <Text style={styles.panelHeaderText}>Current challenge</Text>
            </View>
            <Text style={styles.promptText}>{activeTask}</Text>
            <Text style={styles.sourceText}>Source: {materialName}</Text>
          </View>

          <View style={styles.answerPanel}>
            <Text style={styles.sectionTitle}>Typed attempt</Text>
            <TextInput
              multiline
              value={typedAnswer}
              onChangeText={setTypedAnswer}
              placeholder="Write your explanation, working, or summary here..."
              placeholderTextColor="#94A3B8"
              style={styles.answerInput}
              textAlignVertical="top"
            />
            <Pressable style={styles.primaryButton} onPress={submitTypedAnswer}>
              <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Submit typed answer</Text>
            </Pressable>
          </View>

          <View style={styles.photoPanel}>
            <View style={styles.photoCopy}>
              <Text style={styles.sectionTitle}>Handwritten attempt</Text>
              <Text style={styles.smallText}>
                Snap your notebook or worksheet. Reka checks that it looks like a real attempt, not
                a blank or random bypass image.
              </Text>
            </View>
            <Pressable style={styles.secondaryButton} onPress={openCamera}>
              <Ionicons name="camera-outline" size={18} color="#0F172A" />
              <Text style={styles.secondaryButtonText}>Open camera</Text>
            </Pressable>
          </View>

          {photoPreview ? <Image source={{ uri: photoPreview }} style={styles.photoPreview} /> : null}

          <View
            style={[
              styles.feedbackBox,
              attemptStatus === 'accepted' && styles.feedbackAccepted,
              attemptStatus === 'rejected' && styles.feedbackRejected,
            ]}>
            <Ionicons
              name={attemptStatus === 'rejected' ? 'alert-circle' : 'sparkles'}
              size={18}
              color={attemptStatus === 'rejected' ? '#B91C1C' : '#2563EB'}
            />
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.dashboardContent} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandName}>Task Deposit</Text>
              <Text style={styles.brandSubline}>Study first. Scroll after.</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Turn app cravings into quick recall reps.</Text>
          <Text style={styles.heroText}>
            Upload learning material, let Reka generate a checkpoint, then unlock blocked apps only
            after a visible attempt.
          </Text>
        </View>

        <View style={styles.uploadPanel}>
          <View style={styles.uploadIcon}>
            <Ionicons name="document-attach" size={24} color="#2563EB" />
          </View>
          <View style={styles.uploadCopy}>
            <Text style={styles.sectionTitle}>Learning material</Text>
            <Text numberOfLines={1} style={styles.smallText}>
              {materialName}
            </Text>
          </View>
          <Pressable
            disabled={isUploadingMaterial}
            style={({ pressed }) => [styles.compactButton, pressed && styles.pressed]}
            onPress={uploadMaterial}>
            {isUploadingMaterial ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                <Text style={styles.compactButtonText}>Upload</Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{completionRate}%</Text>
            <Text style={styles.statLabel}>attempt rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>57</Text>
            <Text style={styles.statLabel}>minutes saved</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>tasks ready</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Blocked apps</Text>
          <Text style={styles.smallText}>Demo trigger</Text>
        </View>
        <View style={styles.appGrid}>
          {blockedApps.map((app) => (
            <Pressable
              key={app.name}
              style={({ pressed }) => [styles.appCard, pressed && styles.pressed]}
              onPress={() => openBlockedApp(app)}>
              <View style={[styles.appIcon, { backgroundColor: app.color }]}>
                <Ionicons name={app.icon} size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.appName}>{app.name}</Text>
              <Text style={styles.appMeta}>{app.minutes} min unlock</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.timelinePanel}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent deposits</Text>
            <Ionicons name="analytics" size={18} color="#64748B" />
          </View>
          {recentDeposits.map((deposit) => (
            <View key={deposit.title} style={styles.depositRow}>
              <View
                style={[
                  styles.depositDot,
                  deposit.verdict === 'Accepted' ? styles.depositAccepted : styles.depositRejected,
                ]}
              />
              <View style={styles.depositCopy}>
                <Text style={styles.depositTitle}>{deposit.title}</Text>
                <Text style={styles.depositMeta}>
                  {deposit.verdict} · {deposit.time}
                </Text>
              </View>
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
  dashboardContent: {
    padding: 20,
    paddingBottom: 36,
    gap: 18,
  },
  hero: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 24,
    gap: 18,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  logoMark: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  brandSubline: {
    color: '#CBD5E1',
    fontSize: 13,
    marginTop: 2,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  heroText: {
    color: '#DDE7F3',
    fontSize: 15,
    lineHeight: 22,
  },
  uploadPanel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 14,
  },
  uploadIcon: {
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  uploadCopy: {
    flex: 1,
  },
  compactButton: {
    alignItems: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    minHeight: 42,
    minWidth: 96,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  compactButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    padding: 14,
  },
  statValue: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '800',
  },
  smallText: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 19,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  appCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    width: '47.8%',
  },
  appIcon: {
    alignItems: 'center',
    borderRadius: 18,
    height: 50,
    justifyContent: 'center',
    marginBottom: 14,
    width: 50,
  },
  appName: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  appMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  timelinePanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  depositRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  depositDot: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  depositAccepted: {
    backgroundColor: '#16A34A',
  },
  depositRejected: {
    backgroundColor: '#DC2626',
  },
  depositCopy: {
    flex: 1,
  },
  depositTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
  depositMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
  challengeContent: {
    gap: 18,
    padding: 20,
    paddingBottom: 36,
  },
  challengeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  appBadge: {
    alignItems: 'center',
    borderRadius: 18,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  lockedTitle: {
    color: '#0F172A',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  lockedSubtitle: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 21,
  },
  promptPanel: {
    backgroundColor: '#EAF2FF',
    borderColor: '#BFDBFE',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  panelHeaderText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  promptText: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 29,
  },
  sourceText: {
    color: '#475569',
    fontSize: 12,
  },
  answerPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  answerInput: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 18,
    borderWidth: 1,
    color: '#0F172A',
    fontSize: 15,
    minHeight: 128,
    padding: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  photoPanel: {
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 24,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
  },
  photoCopy: {
    flex: 1,
    gap: 4,
  },
  photoPreview: {
    alignSelf: 'center',
    borderRadius: 18,
    height: 120,
    width: 120,
  },
  feedbackBox: {
    alignItems: 'flex-start',
    backgroundColor: '#EEF6FF',
    borderColor: '#BFDBFE',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  feedbackAccepted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },
  feedbackRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  feedbackText: {
    color: '#334155',
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  cameraScreen: {
    backgroundColor: '#000000',
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 18,
  },
  cameraTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconButtonLight: {
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  cameraTaskPill: {
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    borderRadius: 999,
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cameraTaskText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  captureBar: {
    alignItems: 'center',
    paddingBottom: 22,
  },
  captureButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    height: 74,
    justifyContent: 'center',
    width: 74,
  },
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    padding: 24,
  },
  unlockHalo: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: 999,
    height: 76,
    justifyContent: 'center',
    width: 76,
  },
  successTitle: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  successText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  receipt: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  receiptLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  receiptText: {
    color: '#0F172A',
    fontSize: 14,
    lineHeight: 20,
  },
  receiptDivider: {
    backgroundColor: '#E2E8F0',
    height: 1,
  },
});
