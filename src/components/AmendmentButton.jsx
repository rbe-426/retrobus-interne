import { useState } from 'react';
import { Box, Button, Image } from '@chakra-ui/react';
import { AmendmentIcon } from './icons';

// Image maison : déposer le fichier dans Interne/public/amendement-a-deposer.svg (ou .png en changeant l'extension ci-dessous).
export const AMENDMENT_IMAGE_SRC = '/amendement-a-deposer.svg';

export default function AmendmentButton({ onClick, ...props }) {
  const [missing, setMissing] = useState(false);

  if (missing) {
    return (
      <Button size="sm" variant="outline" colorScheme="rbe" leftIcon={<AmendmentIcon boxSize={4} />} onClick={onClick} {...props}>
        Amendement à déposer
      </Button>
    );
  }

  return (
    <Box as="button" type="button" onClick={onClick} aria-label="Amendement à déposer" title="Amendement à déposer" flexShrink={0} _hover={{ transform: 'scale(1.05)' }} transition="transform 0.15s" {...props}>
      <Image src={AMENDMENT_IMAGE_SRC} alt="Amendement à déposer" h="56px" onError={() => setMissing(true)} />
    </Box>
  );
}
