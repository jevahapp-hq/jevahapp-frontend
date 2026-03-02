import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface CategoryTabsProps {
  categories: string[];
  selectedCategory: string;
  onSelect: (category: string) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategory,
  onSelect,
}) => {
  return (
    <View className="mt-5 ">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {categories.map((category, index) => {
          const isLive = category.toUpperCase() === 'LIVE';
          const isSelected = selectedCategory === category;

          const baseStyles = 'w-[55px] h-[33px] mr-3 rounded-[8px] items-center justify-center border';
          const liveStyles = isSelected
            ? 'bg-black border-black'
            : 'bg-white border-gray-300';

          const tabStyles = isLive
            ? `${baseStyles} ${liveStyles}`
            : `${baseStyles} ${isSelected ? 'bg-black border-black' : 'border-gray-300 bg-white'}`;

          const textColor = isSelected ? 'text-white' : 'text-gray-600';

          return (
            <TouchableOpacity
              key={index}
              className={tabStyles}
              onPress={() => onSelect(category)}
            >
              <View className="relative flex items-center justify-center">
                <Text className={`text-xs font-semibold ${textColor}`}>
                  {category}
                </Text>

                {/* 🔴 Red dot for LIVE always */}
                {isLive && (
                  <View className="absolute -top-2  mt-1 right-0 w-1 h-1 rounded-full bg-red-500" />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export default CategoryTabs;
