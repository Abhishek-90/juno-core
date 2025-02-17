/**
 * @function convertArrayToString
 * @param data - takes in a string or array of string
 * @returns a single string, if there is valid input, the output will have no more commas. If no valid input, it will return an empty string.
 */

const convertArrayToString = (data: string | string[]) => {
  if (data && typeof data === 'string') {
    const converted = data.toString().replace(',', '-')
    return converted
  }
  if (data && Array.isArray(data)) {
    const converted = data[0].toString().replace(',', '-')
    return converted
  }
  return ''
}

export default convertArrayToString
