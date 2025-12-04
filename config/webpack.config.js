const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      main: './frontend/js/app/app.js',
      simulation: './frontend/js/modules/simulation-engine/SimulationEngine.js',
      visualization: './frontend/js/modules/visualization/Visualization3D.js'
    },
    
    output: {
      path: path.resolve(__dirname, '../dist'),
      filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
      publicPath: '/',
      clean: true
    },
    
    mode: isProduction ? 'production' : 'development',
    
    devtool: isProduction ? 'source-map' : 'eval-source-map',
    
    devServer: {
      static: {
        directory: path.join(__dirname, '../dist')
      },
      port: 3000,
      hot: true,
      open: true,
      historyApiFallback: true,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true
        }
      }
    },
    
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: ['@babel/plugin-transform-runtime']
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\.scss$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader',
            'postcss-loader',
            'sass-loader'
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[hash][ext][query]'
          }
        },
        {
          test: /\.(glb|gltf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'models/[hash][ext][query]'
          }
        }
      ]
    },
    
    plugins: [
      new CleanWebpackPlugin(),
      
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html',
        chunks: ['main'],
        minify: isProduction
      }),
      
      new MiniCssExtractPlugin({
        filename: isProduction ? 'css/[name].[contenthash].css' : 'css/[name].css'
      })
    ],
    
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          three: {
            test: /[\\/]node_modules[\\/](three)[\\/]/,
            name: 'three',
            chunks: 'all',
          },
          chart: {
            test: /[\\/]node_modules[\\/](chart\.js)[\\/]/,
            name: 'chart',
            chunks: 'all',
          }
        }
      },
      runtimeChunk: 'single'
    },
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '../frontend'),
        '@js': path.resolve(__dirname, '../frontend/js'),
        '@css': path.resolve(__dirname, '../frontend/css'),
        '@assets': path.resolve(__dirname, '../frontend/assets')
      },
      extensions: ['.js', '.json']
    },
    
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    }
  };
};