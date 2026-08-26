export function appendConversionItem(items, item) {
  return [...items, item]
}

export function replaceConversionItem(items, item) {
  return items.map((currentItem) => (currentItem.id === item.id ? item : currentItem))
}

export function removeConversionItem(items, id) {
  return items.filter((item) => item.id !== id)
}
