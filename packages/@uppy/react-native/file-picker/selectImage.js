// Using leading underscore so eslint compat plugin doesn't yell at us.
import * as _Permissions from 'expo-permissions'
import * as ImagePicker from 'expo-image-picker'

function selectImageWithExpo (options) {
  return _Permissions.askAsync(_Permissions.CAMERA_ROLL)
    .then((isAllowed) => (isAllowed ? ImagePicker.launchImageLibraryAsync(options)
      : Promise.reject(new Error('Permissions denied'))))
    .then((result) => (!result.cancelled ? result
      : Promise.reject(new Error('Operation cancelled'))))
}

export default selectImageWithExpo
