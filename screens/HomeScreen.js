import React, { useState, useRef } from 'react';
import { Dimensions, StyleSheet, View, Text, TouchableOpacity, Modal, Image, Animated, } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import kayakImage from '../assets/kayakImage.jpg';

const mockYakRacks = [
    {  
      id: '1',
      latitude: 37.78825,
      longitude: -122.4324,
      title: 'YakRack #1',
      description: 'Available',
      price: '$5/hour',
      rating: 4.5,
      imageUrl: kayakImage,
    },
  // Add more mock YakRack locations here if needed
];

export default function HomeScreen() {
  const [selectedRack, setSelectedRack] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const navigation = useNavigation();

  const onMarkerPress = (rack) => {
    setSelectedRack(rack);
    setModalVisible(true);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.banner}
        onPress={() => navigation.navigate('Details')}
      >
        <Text style={styles.bannerText}>Click here for more details</Text>
      </TouchableOpacity>
      <MapView
        style={styles.map}
        showsUserLocation
        initialRegion={{
          latitude: 37.78825,
          longitude: -122.4324,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        {mockYakRacks.map((rack) => (
          <Marker key={rack.id} coordinate={{ latitude: rack.latitude, longitude: rack.longitude }} onPress={() => onMarkerPress(rack)}>
            <Animated.View style={[styles.markerStyle, { transform: [{ scale: selectedRack && selectedRack.id === rack.id ? scaleAnim : 1 }] }]}>
              <Text style={{ fontSize: 30 }}>🛶</Text>
            </Animated.View>
          </Marker>
        ))}
      </MapView>
      {modalVisible && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => {
            setModalVisible(!modalVisible);
          }}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(!modalVisible)}
              >
                <Text style={styles.closeButtonText}>X</Text>
              </TouchableOpacity>
              {selectedRack && (
                <Image source={kayakImage} style={styles.kayakImage} />              )}
              <Text style={styles.modalText}>{selectedRack ? `${selectedRack.title} - ${selectedRack.rating} ★` : 'YakRack Details'}</Text>
              <Text>Price: {selectedRack ? selectedRack.price : ''}</Text>
              <Text>Availability: {selectedRack ? selectedRack.description : ''}</Text>
              <TouchableOpacity style={styles.rentButton} onPress={() => {}}>
                <Text style={styles.rentButtonText}>Rent</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    banner: {
        backgroundColor: 'purple', // Temporarily set to red for high visibility
        paddingVertical: 15,
        paddingHorizontal: 20,
        position: 'absolute',
        top: 20, // Adjust for status bar height
        left: 20,
        right: 20,
        borderRadius: 25,
        zIndex: 15, // Ensure it's on top
        borderWidth: 4, // For debugging visibility
        borderColor: 'skyblue', // For debugging visibility
      },
      bannerText: {
        color: '#bafff8', // Bright cyan, adjust as needed for your neon blue
        fontWeight: 'bold',
        textAlign: 'center',
        textShadowColor: 'cyan', // This should be the same or similar to the text color but can be adjusted for desired glow effect
        textShadowOffset: {width: 0, height: 0}, // Center the shadow around the text
        textShadowRadius: 20, // Adjust the blur radius to control the glow extent
      },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  markerStyle: {
    padding: 10,
    backgroundColor: '#FFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  kayakImage: {
    width: '90%', // Adjust the width as necessary
    height: 200, // Adjust the height as necessary
    borderRadius: 10,
    alignSelf: 'center', // This centers the image in the modal
    zIndex: 15, // Ensure it's on top
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    backgroundColor: '#aaaaaa',
    borderRadius: 90,
    padding: 15, // Increase the padding
    margin: 10,
    elevation: 2,
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    color: 'white',
    // fontWeight: 'bold', // Remove this line
    textAlign: 'center',
  },
  rentButton: {
    backgroundColor: '#007bff',
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
  },
  rentButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  // Add or adjust other styles as needed
});
