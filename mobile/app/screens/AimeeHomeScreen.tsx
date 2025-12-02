import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';

const warmStoneBackground = '#E6D5C3';
const bronzeAccent = '#CD7F32';
const charcoalText = '#333333';

type AimeeHomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AimeeHome'>;

interface Props {
  navigation: AimeeHomeScreenNavigationProp;
}

export default function AimeeHomeScreen({ navigation }: Props) {
  const handleLetBeginPress = () => {
    console.log('AImee start pressed');
    navigation.navigate('AimeeConversation');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Title Block */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>
            <Text style={styles.titleAI}>AI</Text>
            <Text style={styles.titleMee}>mee</Text>
          </Text>
          <Text style={styles.subtitle}>Your AI Travel Companion</Text>
        </View>

        {/* Logo Area */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/aimee-ui-transparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Primary Action Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.beginButton} onPress={handleLetBeginPress}>
            <Text style={styles.beginButtonText}>Let's Begin</Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Tagline */}
        <View style={styles.taglineContainer}>
          <Text style={styles.tagline}>Discover • Explore • Learn</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: warmStoneBackground,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  titleBlock: {
    alignItems: 'center',
    paddingTop: 60,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  titleAI: {
    color: bronzeAccent,
  },
  titleMee: {
    color: charcoalText,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: charcoalText,
    opacity: 0.8,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  logo: {
    width: 240,
    height: 240,
  },
  buttonContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  beginButton: {
    backgroundColor: bronzeAccent,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  beginButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  taglineContainer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '300',
    color: charcoalText,
    opacity: 0.7,
    letterSpacing: 1,
  },
});