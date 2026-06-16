import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Button, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // APP NAVIGATION STATES: 'HOME', 'LOCKED', 'CAMERA', 'UNLOCKED'
  const [currentScreen, setCurrentScreen] = useState('HOME');
  
  const [isUploading, setIsUploading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>We need camera permission for the AI to work.</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const takePictureAndSend = async () => {
    if (cameraRef.current) {
      try {
        setIsUploading(true);
        const photo = await cameraRef.current.takePictureAsync();
        const formData = new FormData();
        formData.append('file', {
          uri: photo.uri,
          name: 'hackathon_test.jpg',
          type: 'image/jpeg',
        } as any);

        // 🚨 REPLACE WITH YOUR LAPTOP IP ADDRESS 🚨
        const response = await fetch('https://taskdeposit-summerbuild.onrender.com/upload-task', {
          method: 'POST',
          body: formData,
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        const result = await response.json();
        const aiData = JSON.parse(result.message.replace(/```json|```/g, ''));

        if (aiData.valid === true) {
            setCurrentScreen('UNLOCKED');
            setAiFeedback(""); 
        } else {
            setAiFeedback("Rejected: " + aiData.reason);
        }
      } catch (error) {
        setAiFeedback("Network error. Is the Python server running?");
        console.error(error);
      } finally {
        setIsUploading(false);
      }
    }
  };

  // --- SCREEN 1: THE FAKE PHONE HOME SCREEN ---
  if (currentScreen === 'HOME') {
      return (
          <View style={styles.homeContainer}>
              <Text style={styles.clockText}>9:41</Text>
              <Text style={styles.simText}>Demo Phone Simulator</Text>
              
              <View style={styles.appGrid}>
                  {/* The Fake Instagram App */}
                  <TouchableOpacity 
                    style={styles.appIcon} 
                    onPress={() => setCurrentScreen('LOCKED')}
                  >
                      <View style={[styles.iconBox, { backgroundColor: '#E1306C' }]} />
                      <Text style={styles.iconText}>Instagram</Text>
                  </TouchableOpacity>

                  {/* Dummy App */}
                  <View style={styles.appIcon}>
                      <View style={[styles.iconBox, { backgroundColor: '#1DA1F2' }]} />
                      <Text style={styles.iconText}>Twitter</Text>
                  </View>

                  {/* Dummy App */}
                  <View style={styles.appIcon}>
                      <View style={[styles.iconBox, { backgroundColor: '#FF0000' }]} />
                      <Text style={styles.iconText}>YouTube</Text>
                  </View>
              </View>
          </View>
      )
  }

  // --- SCREEN 2: THE LOCKED SCREEN ---
  if (currentScreen === 'LOCKED') {
    return (
        <View style={styles.container}>
        <Text style={styles.title}>TaskDeposit</Text>
        <Text style={styles.warningText}>Instagram is currently Locked.</Text>
        
        <View style={styles.taskBox}>
            <Text style={styles.taskPrompt}>Task: Write out the formula for the Krebs Cycle and snap a photo.</Text>
        </View>
        
        <View style={{ gap: 20 }}>
            <Button title="Open Camera to Deposit Task" onPress={() => setCurrentScreen('CAMERA')} color="#1a73e8" />
            <Button title="Give Up (Go to Home)" onPress={() => setCurrentScreen('HOME')} color="#5f6368" />
        </View>
        </View>
    );
  }

  // --- SCREEN 3: THE CAMERA SCREEN ---
  if (currentScreen === 'CAMERA') {
    return (
      <View style={styles.container}>
        <CameraView style={styles.camera} facing="back" ref={cameraRef}>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setCurrentScreen('LOCKED')}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.snapButton} onPress={takePictureAndSend} disabled={isUploading}>
              {isUploading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Snap & Submit</Text>}
            </TouchableOpacity>
          </View>
        </CameraView>
        
        {aiFeedback !== "" && (
            <View style={styles.errorBox}>
                <Text style={styles.errorText}>{aiFeedback}</Text>
            </View>
        )}
      </View>
    );
  }

  // --- SCREEN 4: THE SUCCESS SCREEN ---
  if (currentScreen === 'UNLOCKED') {
      return (
        <View style={[styles.container, { backgroundColor: '#e6f4ea' }]}>
            <Text style={styles.title}>🎉 Unlocked!</Text>
            <Text style={styles.messageText}>Reka AI verified your task.</Text>
            <Text style={styles.messageText}>You have earned 15 minutes of scrolling.</Text>
            
            <View style={{marginTop: 40, gap: 20}}>
                <Button title="Open Instagram" onPress={() => alert("Simulation Complete! User is now in Instagram.")} color="#E1306C" />
                <Button title="Reset Demo" onPress={() => setCurrentScreen('HOME')} color="#34a853" />
            </View>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10, color: '#202124' },
  warningText: { fontSize: 18, color: '#d93025', fontWeight: 'bold', marginBottom: 30 },
  messageText: { fontSize: 18, marginBottom: 10, color: '#5f6368', textAlign: 'center' },
  taskBox: { backgroundColor: '#e8f0fe', padding: 20, borderRadius: 10, marginBottom: 30, width: '100%' },
  taskPrompt: { fontSize: 18, color: '#1a73e8', fontWeight: '600', textAlign: 'center' },
  camera: { flex: 1, width: '100%', borderRadius: 20, overflow: 'hidden' },
  buttonContainer: { position: 'absolute', bottom: 40, width: '100%', flexDirection: 'row', justifyContent: 'space-around' },
  closeButton: { backgroundColor: 'rgba(255, 59, 48, 0.9)', padding: 15, borderRadius: 10, width: 120, alignItems: 'center' },
  snapButton: { backgroundColor: 'rgba(52, 199, 89, 0.9)', padding: 15, borderRadius: 10, width: 160, alignItems: 'center' },
  buttonText: { fontSize: 18, color: 'white', fontWeight: 'bold' },
  errorBox: { position: 'absolute', top: 60, backgroundColor: 'rgba(255, 59, 48, 0.9)', padding: 15, borderRadius: 10, width: '90%' },
  errorText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  
  // Fake Home Screen Styles
  homeContainer: { flex: 1, backgroundColor: '#000', paddingTop: 60, alignItems: 'center' },
  clockText: { color: 'white', fontSize: 48, fontWeight: 'bold', marginBottom: 10 },
  simText: { color: '#888', fontSize: 14, marginBottom: 60 },
  appGrid: { flexDirection: 'row', gap: 30, flexWrap: 'wrap', justifyContent: 'center' },
  appIcon: { alignItems: 'center' },
  iconBox: { width: 70, height: 70, borderRadius: 18, marginBottom: 8 },
  iconText: { color: 'white', fontSize: 12 }
});