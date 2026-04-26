export const DISH_IMAGE_SOURCES = {
  'Boiled Eggs': require('../../../../FoodImages/boiledegg.png'),
  Omelet: require('../../../../FoodImages/omelette.png'),
  'Butter Bread': require('../../../../FoodImages/breadbutter.png'),
  Tea: require('../../../../FoodImages/tea.png'),
  'Veg Poha': require('../../../../FoodImages/poha.png'),
  Pasta: require('../../../../FoodImages/pasta.png'),
  'Boiled Rice': require('../../../../FoodImages/rice.png'),
  Roti: require('../../../../FoodImages/roti.png'),
  'Stir-Fried Vegetables': require('../../../../FoodImages/sautvegetables.png'),
};

export function getDishImageSourceByName(name) {
  return DISH_IMAGE_SOURCES[String(name || '').trim()] || null;
}
