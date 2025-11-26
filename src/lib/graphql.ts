import { gql } from '@apollo/client';

// ----- QUERIES -----

export const ME_QUERY = gql`
  query Me {
    me {
      _id
      username
      clerkId
      stats {
        wins
        losses
        draws
      }
    }
  }
`;

// Gets all games for the logged-in user
export const MY_GAMES_QUERY = gql`
  query MyGames {
    myGames {
      _id
      status
      whitePlayer {
        _id
        username
      }
      blackPlayer {
        _id
        username
      }
      winner
      timeControl
    }
  }
`;

export const MY_GAME_HISTORY_QUERY = gql`
  query MyGameHistory($limit: Int, $offset: Int) {
    myGameHistory(limit: $limit, offset: $offset) {
      games {
        _id
        status
        winner
        finishReason
        createdAt
        updatedAt
        pgn
        fen
        whitePlayer {
          _id
          username
        }
        blackPlayer {
          _id
          username
        }
        timeControl
      }
      total
      hasMore
    }
  }
`;

export const GET_GAME_HISTORY_QUERY = gql`
  query GetGameHistory($gameId: ID!) {
    game(id: $gameId) {
      _id
      status
      winner
      finishReason
      createdAt
      updatedAt
      pgn
      fen
      whitePlayer {
        _id
        username
      }
      blackPlayer {
        _id
        username
      }
      timeControl
    }
  }
`;

// Gets all games (we will filter this on the frontend)
export const ALL_GAMES_QUERY = gql`
  query AllGames {
    games {
      _id
      status
      whitePlayer {
        _id
        username
      }
    }
  }
`;

export const OPEN_GAMES_QUERY = gql`
  query OpenGames {
    openGames {
      _id
      status
      timeControl
      whitePlayer {
        _id
        username
      }
      blackPlayer {
        _id
        username
      }
    }
  }
`;

// ----- MUTATIONS -----

// Creates a new game
export const CREATE_GAME_MUTATION = gql`
  mutation CreateGame($input: CreateGameInput!) {
    createGame(input: $input) {
      _id
      timeControl
      whiteTimeLeft
      blackTimeLeft
      lastMoveAt
      whitePlayer { _id username }
    }
  }
`;

// Joins an existing game
export const JOIN_GAME_MUTATION = gql`
  mutation JoinGame($gameId: ID!) {
    joinGame(gameId: $gameId) {
      _id
      whitePlayer { username }
      blackPlayer { username }
      status
    }
  }
`;

export const GET_OPEN_GAMES = gql`
  query GetOpenGames {
    openGames {
      _id
      status
      timeControl
      whitePlayer {
        _id
        username
      }
      blackPlayer {
        _id
        username
      }
    }
  }
`;

export const GET_GAME_QUERY = gql`
  query GetGame($gameId: ID!) {
    game(id: $gameId) {
      _id
      fen
      pgn
      status
      winner
      timeControl

      whiteTimeLeft
      blackTimeLeft
      lastMoveAt

      finishReason

      whitePlayer { 
        _id 
        username
        stats {
          wins
          losses
          draws
        }
      }
      blackPlayer { 
        _id 
        username
        stats {
          wins
          losses
          draws
        }
      }

      drawOffered
      whiteDrawOffers
      blackDrawOffers
      drawOfferedBy { _id username }

      rematchOffered
      rematchOfferedBy { _id username }
      rematchStatus
      rematchGameId
    }
  }
`;

export const GET_MESSAGES_QUERY = gql`
  query MessagesForGame($gameId: ID!) {
    messagesForGame(gameId: $gameId) {
      _id
      content
      createdAt
      user {
        _id
        username
      }
    }
  }
`;

// ----- MUTATIONS (for Game Page) -----

export const MAKE_MOVE_MUTATION = gql`
  mutation MakeMove($makeMoveInput: MakeMoveInput!) {
    makeMove(makeMoveInput: $makeMoveInput) {
      _id
    }
  }
`;

export const RESIGN_GAME_MUTATION = gql`
  mutation ResignGame($gameId: ID!) {
    resignGame(gameId: $gameId) {
      _id
      status
      winner
    }
  }
`;

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(sendMessageInput: $input) {
      _id
      content
      createdAt
      user {
        _id
        username
      }
    }
  }
`;

export const OFFER_DRAW_MUTATION = gql`
  mutation OfferDraw($gameId: ID!) {
    offerDraw(gameId: $gameId) {
      _id
      status
      winner
      drawOffered
      whiteDrawOffers
      blackDrawOffers
      finishReason
      drawOfferedBy { _id username }
    }
  }
`;

export const RESPOND_DRAW_MUTATION = gql`
  mutation RespondDraw($gameId: ID!, $accept: Boolean!) {
    respondDraw(gameId: $gameId, accept: $accept) {
      _id
      status
      winner
      drawOffered
      whiteDrawOffers
      blackDrawOffers
      finishReason
      drawOfferedBy { _id username }
    }
  }
`;

// ----- SUBSCRIPTIONS (for Game Page) -----

export const GAME_UPDATED_SUBSCRIPTION = gql`
  subscription GameUpdated($gameId: ID!) {
    gameUpdated(gameId: $gameId) {
      _id
      status
      winner
      fen
      pgn
      whiteTimeLeft
      blackTimeLeft
      lastMoveAt

      whitePlayer { 
        _id 
        username
        stats {
          wins
          losses
          draws
        }
      }
      blackPlayer { 
        _id 
        username
        stats {
          wins
          losses
          draws
        }
      }

      drawOffered
      drawOfferedBy { _id username }
      whiteDrawOffers
      blackDrawOffers
      finishReason

      rematchOffered
      rematchOfferedBy { _id username }
      rematchStatus
      rematchGameId
    }
  }
`;
// 🔧 FIXED: Changed from ID! to String! to match backend resolver
export const MATCH_FOUND_SUBSCRIPTION = gql`
  subscription MatchFound($userId: String!) {
    matchFound(userId: $userId) {
      _id
      status
      timeControl
      whitePlayer { _id username }
      blackPlayer { _id username }
    }
  }
`;

export const MESSAGE_SUBSCRIPTION = gql`
  subscription NewMessage($gameId: ID!) {
    newMessage(gameId: $gameId) {
      _id
      content
      createdAt
      user {
        _id
        username
      }
    }
  }
`;

export const QUICK_MATCH_MUTATION = gql`
  mutation QuickMatch($timeControl: String!) {
    quickMatch(timeControl: $timeControl) {
      _id
      whitePlayer { _id username }
      blackPlayer { _id username }
      status
      timeControl
    }
  }
`;

export const CANCEL_MATCH_MUTATION = gql`
  mutation CancelMatch {
    cancelMatch
  }
`;

export const OFFER_REMATCH_MUTATION = gql`
  mutation OfferRematch($gameId: ID!) {
    offerRematch(gameId: $gameId) {
      _id
      rematchOffered
      rematchOfferedBy { _id username }
      rematchStatus
      rematchGameId
    }
  }
`;

export const RESPOND_REMATCH_MUTATION = gql`
  mutation RespondRematch($gameId: ID!, $accept: Boolean!) {
    respondRematch(gameId: $gameId, accept: $accept) {
      _id
      rematchOffered
      rematchStatus
      rematchGameId

      whitePlayer { _id username }
      blackPlayer { _id username }
    }
  }
`;

export const GET_PLATFORM_STATS = gql`
  query GetPlatformStats {
    platformStats {
      totalUsers
      totalGames
    }
  }
`;