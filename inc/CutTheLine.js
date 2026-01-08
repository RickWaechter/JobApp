import { View } from 'react-native';

const CutLine = ({ color = 'gray', thickness = 1, margin = 10 }) => {
    return <View style={{ borderBottomWidth: thickness, borderBottomColor: color, marginVertical: margin, width: '100%' }} />;
  };
  
  export default CutLine;