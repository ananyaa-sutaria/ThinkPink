import { View, StyleSheet } from 'react-native';
import { SvgUri } from 'react-native-svg';

const VECTOR_IMAGE_URL = 'http://localhost:3845/assets/f0523c847b3da3ff2eeac70aba85aa94576fd5f0.svg';

export default function VectorImage() {
  return (
    <View style={styles.container} accessibilityLabel="Vector" testID="vector-image">
      <SvgUri
        uri={VECTOR_IMAGE_URL}
        width="100%"
        height="100%"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
