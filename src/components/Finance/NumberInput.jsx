import React from 'react';
import { NumberInput as ChakraNumberInput } from '@chakra-ui/react';

const isDecimalChar = (c) => /^[0-9.,+\-eE]$/.test(c);
const parseDecimal = (v) => String(v).replace(',', '.');

// NumberInput Chakra qui accepte la virgule comme séparateur décimal.
// Conserve la saisie brute ("2," / "2.") tant qu'elle correspond à la valeur numérique du parent.
const NumberInput = React.forwardRef(({ value, onChange, ...rest }, ref) => {
  const [text, setText] = React.useState(value === undefined || value === null ? '' : String(value));

  React.useEffect(() => {
    const ext = value === undefined || value === null ? '' : String(value);
    setText((cur) => {
      if (ext === '' && cur === '') return cur;
      const a = parseFloat(parseDecimal(cur));
      const b = parseFloat(ext);
      if (ext !== '' && !Number.isNaN(a) && a === b) return cur;
      return ext;
    });
  }, [value]);

  return (
    <ChakraNumberInput
      ref={ref}
      isValidCharacter={isDecimalChar}
      parse={parseDecimal}
      {...rest}
      value={text}
      onChange={(str, num) => {
        setText(str);
        if (onChange) onChange(str, num);
      }}
    />
  );
});

export default NumberInput;
