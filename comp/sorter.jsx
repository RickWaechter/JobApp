import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { createThumbnail } from 'react-native-pdf-thumbnail';
import DraggableFlatList from 'react-native-draggable-flatlist';

const Sorter = ({ pdfFiles, onOrderChange }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const loadThumbnails = async () => {
      console.log('Loading thumbnails for', pdfFiles);
      const updated = await Promise.all(
        pdfFiles.map(async (file, index) => {
          try {
            const { uri } = await createThumbnail(file.path);
            return { ...file, id: file.path, thumbnail: uri };
          } catch (err) {
            console.warn('Fehler bei Thumbnail:', err);
            return { ...file, id: file.path, thumbnail: null };
          }
        })
      );
      console.log('Updated data:', updated);
      setData(updated);
    };
    loadThumbnails();
  }, [pdfFiles]);

  const handleDragEnd = ({ data }) => {
    console.log('Drag ended, new order:', data);
    setData(data);
    onOrderChange(data);
  };

  const renderItem = ({ item, drag, isActive }) => (
    <TouchableOpacity
      onLongPress={drag}
      disabled={isActive}
      style={thumbStyles.itemContainer}
    >
      <Image source={{ uri: item.thumbnail }} style={thumbStyles.thumbnail} />
      <Text style={thumbStyles.label}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <DraggableFlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      onDragEnd={handleDragEnd}
    />
  );
};

const thumbStyles = StyleSheet.create({
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1b2f4b',
    borderRadius: 10,
    marginVertical: 6,
  },
  thumbnail: {
    width: 60,
    height: 80,
    marginRight: 12,
    borderRadius: 4,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    flexShrink: 1,
  },
});

export default Sorter;
