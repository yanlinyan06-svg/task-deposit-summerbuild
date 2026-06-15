import { useState } from 'react';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  // This state variable holds the message from the server
  const [serverMessage, setServerMessage] = useState("Waiting for server...");

  // This function talks to your Python FastAPI server
  const testConnection = async () => {
    try {
      // 🚨 REMEMBER: Replace the IP address below with your laptop's actual Wi-Fi IP address!
      // (Keep the :8000/ping at the end)
      const response = await fetch('http://10.91.184.94:8000/ping');
      const data = await response.json();
      setServerMessage(data.message);
    } catch (error) {
      setServerMessage("Error connecting to server.");
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>TaskDeposit: Day 1</Text>
      <Text style={styles.messageText}>Backend says: {serverMessage}</Text>
      
      {/* A simple button that triggers the fetch function */}
      <Button title="Ping Backend" onPress={testConnection} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1a73e8',
  },
  messageText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#333333',
    textAlign: 'center',
  }
});