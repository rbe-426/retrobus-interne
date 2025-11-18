import React from 'react';
import { Box, Spinner, Alert, AlertIcon, Text } from '@chakra-ui/react';

/**
 * QuoteTemplatePreview Component
 * Renders a quote/invoice template with live placeholder replacement
 * 
 * Props:
 * - template: { id, name, htmlContent, logoSmall, logoBig, placeholders }
 * - data: { VAR_NAME: value, ... } for {{VAR_NAME}} replacement
 */
export default function QuoteTemplatePreview({ template, data }) {
  if (!template) {
    return (
      <Alert status="warning">
        <AlertIcon />
        <Text>Aucun template sélectionné</Text>
      </Alert>
    );
  }

  if (!template.htmlContent) {
    return (
      <Alert status="error">
        <AlertIcon />
        <Text>Contenu HTML du template vide</Text>
      </Alert>
    );
  }

  // Replace placeholders with actual data
  let html = template.htmlContent;
  
  if (data) {
    // Replace {{PLACEHOLDER}} style variables
    Object.entries(data).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder, 'g');
      html = html.replace(regex, value || '');
    });
  }

  // Also replace logo placeholders if present
  if (template.logoBig) {
    html = html.replace(/{{LOGO_BIG}}/g, `data:image/png;base64,${template.logoBig}`);
  }
  if (template.logoSmall) {
    html = html.replace(/{{LOGO_SMALL}}/g, `data:image/png;base64,${template.logoSmall}`);
  }

  return (
    <Box
      maxH="600px"
      overflowY="auto"
      borderWidth="1px"
      borderRadius="md"
      p={4}
      bg="white"
      className="template-preview"
    >
      <div
        dangerouslySetInnerHTML={{ __html: html }}
        style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#333'
        }}
      />
    </Box>
  );
}
