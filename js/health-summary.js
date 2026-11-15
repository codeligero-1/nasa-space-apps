(() => {
  function getStatus(value, range, section) {
    if (!Number.isFinite(value)) return ['na', 'Not Available'];
    if (!range) return ['na', 'Not Rated'];

    const { min, max, warningLow, warningHigh, criticalLow, criticalHigh } = range;
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
      return ['na', 'Not Rated'];
    }

    if (section === 'vitals') {
      if ((Number.isFinite(criticalLow) && value < criticalLow)
        || (Number.isFinite(criticalHigh) && value > criticalHigh)) {
        return ['low', 'Critical'];
      }
      return value < min || value > max ? ['warn', 'Warning'] : ['ok', 'Normal'];
    }

    if ((Number.isFinite(criticalLow) && value < criticalLow)
      || (Number.isFinite(criticalHigh) && value > criticalHigh)) {
      return ['low', 'Critical'];
    }
    if (value < min) {
      if (Number.isFinite(warningLow) && value >= warningLow) return ['warn', 'Borderline'];
      if (Number.isFinite(criticalLow) && value > criticalLow) return ['warn', 'Warning'];
      return ['low', 'Low'];
    }
    if (value > max) {
      if (Number.isFinite(warningHigh) && value <= warningHigh) return ['warn', 'Borderline'];
      if (Number.isFinite(criticalHigh) && value < criticalHigh) return ['warn', 'Warning'];
      return ['low', 'High'];
    }
    return ['ok', 'Normal'];
  }

  function statusForReading(reading) {
    return getStatus(reading[2], reading[8], reading[7]);
  }

  function latestRecord(records, type) {
    return records
      .filter((record) => record.type === type && /^\d{4}-\d{2}-\d{2}$/.test(record.date || ''))
      .sort((left, right) => left.date.localeCompare(right.date))
      .pop() || null;
  }

  function summarize(profile, records, metrics, ranges) {
    const currentRecord = latestRecord(records, 'flight');
    if (!currentRecord) return null;

    const baselineRecord = latestRecord(records, 'baseline');
    const counts = {
      measured: 0,
      rated: 0,
      normal: 0,
      low: 0,
      high: 0,
      warning: 0,
      borderline: 0,
      critical: 0,
      notRated: 0
    };
    const findings = [];

    for (const metric of metrics) {
      const value = currentRecord[metric.section]?.[metric.id];
      if (!Number.isFinite(value)) continue;

      counts.measured += 1;
      const range = metric.range ? ranges[metric.range] || null : null;
      const [statusKey, statusLabel] = getStatus(value, range, metric.section);
      if (statusKey === 'na') {
        counts.notRated += 1;
        continue;
      }

      counts.rated += 1;
      if (statusKey === 'ok') counts.normal += 1;
      if (statusKey === 'low') {
        if (statusLabel === 'Critical') counts.critical += 1;
        else if (statusLabel === 'High') counts.high += 1;
        else counts.low += 1;
      }
      if (statusKey === 'warn') {
        if (statusLabel === 'Borderline') counts.borderline += 1;
        else counts.warning += 1;
      }
      if (statusKey === 'low' || statusKey === 'warn') {
        const baselineValue = baselineRecord?.[metric.section]?.[metric.id];
        const metricName = metric.name.toLowerCase() === metric.abbreviation.toLowerCase()
          ? metric.name
          : `${metric.name} (${metric.abbreviation})`;
        findings.push({
          name: metricName,
          section: metric.section,
          value,
          unit: metric.unit,
          statusKey,
          statusLabel,
          baselineValue: Number.isFinite(baselineValue) ? baselineValue : null,
          decimals: metric.decimals
        });
      }
    }

    const bloodCounts = {
      measured: 0,
      normal: 0,
      low: 0,
      high: 0,
      borderline: 0
    };
    for (const metric of metrics.filter((item) => item.section === 'blood')) {
      const value = currentRecord.blood?.[metric.id];
      if (!Number.isFinite(value)) continue;
      bloodCounts.measured += 1;
      const range = metric.range ? ranges[metric.range] || null : null;
      const [statusKey, statusLabel] = getStatus(value, range, metric.section);
      if (statusKey === 'ok') bloodCounts.normal += 1;
      if (statusKey === 'low' && statusLabel === 'Low') bloodCounts.low += 1;
      if (statusKey === 'low' && statusLabel === 'High') bloodCounts.high += 1;
      if (statusKey === 'warn') bloodCounts.borderline += 1;
    }

    let bloodAssessment = 'Not Available';
    let bloodAssessmentKey = 'na';
    if (bloodCounts.low || bloodCounts.high) {
      bloodAssessment = 'Range flags present';
      bloodAssessmentKey = 'low';
    } else if (bloodCounts.borderline) {
      bloodAssessment = 'Borderline results';
      bloodAssessmentKey = 'warn';
    } else if (bloodCounts.measured && bloodCounts.normal === bloodCounts.measured) {
      bloodAssessment = 'Within configured ranges';
      bloodAssessmentKey = 'ok';
    } else if (bloodCounts.measured) {
      bloodAssessment = 'Some results not rated';
    }

    return {
      crewName: profile.name,
      recordDate: currentRecord.date,
      recordLabel: currentRecord.label || currentRecord.id,
      counts,
      bloodCounts,
      bloodAssessment,
      bloodAssessmentKey,
      findings
    };
  }

  window.VITAL_HEALTH_SUMMARY = Object.freeze({ statusForReading, summarize });
})();
