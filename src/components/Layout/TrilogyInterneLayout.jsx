import React from 'react';
import PageLayout from './PageLayout';

const TrilogyInterneLayout = ({ title, subtitle, children, headerActions, breadcrumbs = [] }) => {
  return (
    <PageLayout
      title={title}
      subtitle={subtitle}
      breadcrumbs={breadcrumbs}
      headerActions={headerActions}
      bgGradient="linear(to-r, rbe.600, rbe.800)"
      maxW="container.xl"
      headerVariant="full"
    >
      {children}
    </PageLayout>
  );
};

export default TrilogyInterneLayout;
