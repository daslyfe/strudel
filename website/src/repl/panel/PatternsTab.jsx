import {
  exportPatterns,
  importPatterns,
  patternFilterName,
  useActivePattern,
  useViewingPatternData,
  userPattern,
} from '../../user_pattern_utils.mjs';
import { useMemo } from 'react';
import { getMetadata } from '../../metadata_parser';
import { useExamplePatterns } from '../useExamplePatterns';
import { parseJSON } from '../util.mjs';
import { ButtonGroup } from './Forms.jsx';
import { settingsMap, useSettings } from '../../settings.mjs';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

function PatternLabel({ pattern } /* : { pattern: Tables<'code'> } */) {
  const meta = useMemo(() => getMetadata(pattern.code), [pattern]);
  let title = meta.title;
  if (title == null) {
    title == pattern.hash;
  }
  if (title == null) {
    const date = new Date(pattern.created_at);
    if (isNaN(date)) {
      return;
    }
    title = date.toLocaleDateString();
  }
  if (title == null) {
    title = 'unnamed';
  }

  return <>{`${pattern.id}: ${title} by ${Array.isArray(meta.by) ? meta.by.join(',') : 'Anonymous'}`}</>;
}

function PatternButton({ showOutline, onClick, pattern, showHiglight }) {
  return (
    <a
      className={classNames(
        'mr-4 hover:opacity-50 cursor-pointer block',
        showOutline && 'outline outline-1',
        showHiglight && 'bg-selection',
      )}
      onClick={onClick}
    >
      <PatternLabel pattern={pattern} />
    </a>
  );
}

function PatternButtons({ patterns, activePattern, onClick, started }) {
  const viewingPatternStore = useViewingPatternData();
  const viewingPatternData = parseJSON(viewingPatternStore);
  const viewingPatternID = viewingPatternData.id;
  return (
    <div className="font-mono text-sm">
      {Object.values(patterns)
        .reverse()
        .map((pattern) => {
          const id = pattern.id;
          return (
            <PatternButton
              pattern={pattern}
              key={id}
              showHiglight={id === viewingPatternID}
              showOutline={id === activePattern && started}
              onClick={() => onClick(id)}
            />
          );
        })}
    </div>
  );
}

function ActionButton({ children, onClick, label, labelIsHidden }) {
  return (
    <button className="hover:opacity-50" onClick={onClick} title={label}>
      {labelIsHidden !== true && label}
      {children}
    </button>
  );
}

export function PatternsTab({ context }) {
  const activePattern = useActivePattern();
  const viewingPatternStore = useViewingPatternData();
  const viewingPatternData = parseJSON(viewingPatternStore);

  const { userPatterns, patternFilter } = useSettings();
  const examplePatterns = useExamplePatterns();
  const collections = examplePatterns.collections;

  const updateCodeWindow = (patternData, reset = false) => {
    context.handleUpdate(patternData, reset);
  };
  const viewingPatternID = viewingPatternData?.id;
  const viewingIDIsValid = userPattern.isValidID(viewingPatternID);
  const isUserPattern = userPatterns[viewingPatternID] != null;

  return (
    <div className="px-4 w-full dark:text-white text-stone-900 space-y-2 pb-4">
      <ButtonGroup
        value={patternFilter}
        onChange={(value) => settingsMap.setKey('patternFilter', value)}
        items={patternFilterName}
      ></ButtonGroup>
      <section>
        {patternFilter === patternFilterName.user && (
          <div>
            <div className="pr-4 space-x-4 border-b border-foreground mb-2 flex overflow-auto max-w-full items-center">
              <ActionButton
                label="new"
                onClick={() => {
                  const { data } = userPattern.createAndAddToDB();
                  updateCodeWindow(data);
                }}
              />
              <ActionButton
                label="duplicate"
                onClick={() => {
                  const { data } = userPattern.duplicate(viewingPatternData);
                  updateCodeWindow(data);
                }}
              />
              <ActionButton
                label="delete"
                onClick={() => {
                  const { data } = userPattern.delete(viewingPatternID);
                  updateCodeWindow({ ...data, collection: userPattern.collection });
                }}
              />
              <label className="hover:opacity-50 cursor-pointer">
                <input
                  style={{ display: 'none' }}
                  type="file"
                  multiple
                  accept="text/plain,application/json"
                  onChange={(e) => importPatterns(e.target.files)}
                />
                import
              </label>
              <ActionButton label="export" onClick={exportPatterns} />

              <ActionButton
                label="delete all"
                onClick={() => {
                  const { data } = userPattern.clearAll();
                  updateCodeWindow(data);
                }}
              />
            </div>
            {/* {viewingIDIsValid && (
              <div className="flex items-center mb-2 space-x-2 overflow-auto">
                <h1 className="text-xl">{`${viewingPatternID}`}</h1>
              </div>
            )} */}

            <PatternButtons
              onClick={(id) => updateCodeWindow({ ...userPatterns[id], collection: userPattern.collection }, false)}
              patterns={userPatterns}
              started={context.started}
              activePattern={activePattern}
              viewingPatternID={viewingPatternID}
            />
          </div>
        )}

        {patternFilter !== patternFilterName.user &&
          Array.from(collections.keys()).map((collection) => {
            const patterns = collections.get(collection);
            return (
              <section key={collection} className="py-2">
                <h2 className="text-xl mb-2">{collection}</h2>
                <div className="font-mono text-sm">
                  <PatternButtons
                    onClick={(id) => updateCodeWindow({ ...patterns[id], collection }, false)}
                    started={context.started}
                    patterns={patterns}
                    activePattern={activePattern}
                  />
                </div>
              </section>
            );
          })}
      </section>
    </div>
  );
}
