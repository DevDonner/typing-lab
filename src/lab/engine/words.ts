/**
 * Bundled word pool for test sampling.
 *
 * Deliberately small and dependency-free: ~450 high-frequency English words —
 * a spread of nouns, verbs, prepositions and connectives so generated text
 * reads plausibly. No proper nouns, numbers, or punctuation. De-duplicated at
 * module load (defensive — duplicates would skew sampling weights).
 */

/** Hard cap so no word breaks the line layout on a phone. */
export const MAX_WORD_LEN = 11

const RAW: string[] = [
  // function words
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so',
  'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'can', 'like', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'your',
  'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only',
  'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'between', 'under', 'never', 'should', 'world', 'still',
  'during', 'before', 'every', 'old', 'while', 'both', 'much', 'through', 'where', 'life',
  'made', 'place', 'turn', 'again', 'high', 'really', 'few', 'small', 'found', 'hand',
  'until', 'side', 'ask', 'keep', 'always', 'why', 'call', 'part', 'point', 'home',
  'leave', 'put', 'stop', 'sure', 'try', 'mind', 'love', 'run', 'move', 'easy',
  'open', 'begin', 'show', 'hear', 'play', 'stand', 'book', 'change', 'word', 'fact',
  'chance', 'value', 'study', 'building', 'country', 'question', 'ground', 'form', 'number', 'system',
  'process', 'school', 'group', 'project', 'information', 'experience', 'event', 'body', 'result', 'company',
  'service', 'name', 'person', 'week', 'night', 'man', 'woman', 'late', 'long', 'early',
  'far', 'middle', 'next', 'whole', 'public', 'enough', 'together', 'quite', 'almost', 'problem',
  'father', 'bit', 'different', 'money', 'since', 'best', 'simple', 'alone', 'second', 'able',
  'close', 'seem', 'food', 'light', 'once', 'often', 'perhaps', 'probably', 'possibly', 'suddenly',
  'certainly', 'actually', 'clearly', 'slowly', 'quickly', 'carefully', 'finally', 'recently', 'generally', 'naturally',
  'usually', 'directly', 'exactly', 'immediately', 'absolutely', 'honestly', 'truly', 'simply', 'merely', 'hardly',
  'nearly', 'entirely', 'completely', 'mainly', 'largely', 'strongly', 'heavily', 'fully', 'partly', 'mostly',
  'chiefly', 'primarily', 'essentially', 'basically', 'effectively', 'practically', 'virtually', 'literally', 'supposedly', 'reportedly',
  'apparently', 'technically', 'theoretically', 'realistically', 'cautiously', 'willingly', 'confidently', 'proudly', 'wisely', 'kindly',
  'gently', 'softly', 'loudly', 'quietly', 'silently', 'rapidly', 'gradually', 'increasingly', 'constantly', 'continuously',
  'repeatedly', 'frequently', 'occasionally', 'rarely', 'seldom', 'sometimes', 'normally', 'typically', 'commonly', 'greatly',
  'slightly', 'very', 'much', 'more', 'less', 'many', 'several', 'various', 'numerous', 'countless',
  'endless', 'finite', 'limited', 'unlimited', 'deep', 'high', 'low', 'big', 'small', 'short',
  'long', 'wide', 'narrow', 'thick', 'thin', 'full', 'empty', 'strong', 'weak', 'hard',
  'soft', 'warm', 'cool', 'hot', 'cold', 'bright', 'dark', 'clear', 'clean', 'dirty',
  'fresh', 'rich', 'poor', 'sweet', 'bitter', 'true', 'false', 'right', 'wrong', 'free',
  // content nouns
  'time', 'year', 'good', 'great', 'hand', 'mother', 'water', 'room', 'family', 'friend',
  'lot', 'voice', 'area', 'story', 'moment', 'song', 'memory', 'picture', 'reason', 'pay',
  'leader', 'record', 'office', 'art', 'power', 'hour', 'line', 'community', 'law', 'control',
  'deal', 'team', 'industry', 'government', 'week', 'thing', 'late', 'early', 'middle', 'next',
  'whole', 'public', 'together', 'alone', 'able', 'close', 'seem', 'food', 'light',
  'once', 'problem', 'father', 'bit', 'different', 'money', 'since', 'best', 'simple', 'second',
  'chance', 'value', 'study', 'building', 'country', 'question', 'ground', 'form', 'number', 'system',
  'process', 'school', 'group', 'project', 'information', 'experience', 'event', 'body', 'result', 'company',
  'service', 'name', 'person', 'night', 'man', 'woman', 'thing', 'place', 'turn', 'side',
  'point', 'home', 'water', 'room', 'family', 'friend', 'mother', 'voice', 'area', 'story',
  'moment', 'song', 'memory', 'picture', 'reason', 'pay', 'leader', 'record', 'office', 'art',
  'power', 'hour', 'line', 'community', 'law', 'control', 'deal', 'team', 'industry', 'government',
  // verbs
  'work', 'think', 'look', 'come', 'go', 'take', 'make', 'know', 'want', 'need',
  'use', 'find', 'give', 'tell', 'put', 'set', 'let', 'begin', 'keep', 'hear',
  'play', 'run', 'move', 'open', 'close', 'start', 'stop', 'turn', 'change', 'help',
  'ask', 'call', 'talk', 'speak', 'read', 'write', 'draw', 'build', 'create', 'design',
  'test', 'check', 'fix', 'break', 'cut', 'mix', 'pour', 'push', 'pull', 'throw',
  'catch', 'carry', 'hold', 'lift', 'drop', 'raise', 'lower', 'rise', 'fall', 'climb',
  'jump', 'walk', 'drive', 'ride', 'swim', 'fly', 'land', 'sail', 'roll', 'spin',
  'fold', 'tear', 'sew', 'knit', 'weave', 'stamp', 'paste', 'glue', 'wire', 'cable',
  'click', 'scroll', 'search', 'type', 'code', 'debug', 'deploy', 'commit', 'branch', 'merge',
  'push', 'pull', 'clone', 'fork', 'patch', 'refactor', 'bundle', 'render', 'cache', 'queue',
  'parse', 'compile', 'launch', 'boot', 'load', 'save', 'store', 'fetch', 'stream', 'sync',
  // adjectives & misc
  'new', 'old', 'young', 'good', 'bad', 'great', 'small', 'large', 'little', 'tiny',
  'huge', 'fast', 'slow', 'quick', 'rapid', 'early', 'late', 'recent', 'former', 'current',
  'final', 'first', 'last', 'next', 'previous', 'following', 'inner', 'outer', 'upper', 'lower',
  'front', 'back', 'top', 'bottom', 'left', 'right', 'near', 'far', 'close', 'distant',
  'deep', 'shallow', 'broad', 'narrow', 'tall', 'short', 'long', 'wide', 'high', 'low',
  'heavy', 'light', 'full', 'empty', 'strong', 'weak', 'firm', 'solid', 'liquid', 'gas',
  'sharp', 'blunt', 'rough', 'smooth', 'flat', 'round', 'square', 'straight', 'curved', 'slanted',
  'bright', 'dim', 'loud', 'quiet', 'noisy', 'calm', 'busy', 'crowded', 'empty', 'full',
  'fresh', 'stale', 'ripe', 'mature', 'younger', 'older', 'rich', 'poor', 'cheap', 'expensive',
  'easy', 'hard', 'simple', 'complex', 'clear', 'unclear', 'true', 'false', 'real', 'fake',
  'true', 'false', 'alive', 'dead', 'awake', 'asleep', 'aware', 'unaware', 'sure', 'unsure',
  'hope', 'fear', 'joy', 'pain', 'peace', 'noise', 'silence', 'color', 'shadow', 'reflection',
  'signal', 'pattern', 'structure', 'behavior', 'process', 'method', 'tool', 'device', 'engine', 'machine',
  'screen', 'keyboard', 'pointer', 'button', 'window', 'frame', 'layer', 'column', 'row', 'grid',
  'table', 'chart', 'graph', 'curve', 'angle', 'radius', 'vector', 'matrix', 'tensor', 'scalar',
  'pixel', 'buffer', 'packet', 'socket', 'server', 'client', 'request', 'response', 'session', 'token',
]

/** De-duplicated, length-capped pool (order-preserving). Tests assert the
 * invariants — the cap is enforced structurally here, not by hope. */
export const WORDS: string[] = [...new Set(RAW)].filter((w) => w.length <= MAX_WORD_LEN)
