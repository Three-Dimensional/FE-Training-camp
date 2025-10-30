// Vue2应用实例
new Vue({
  el: "#app",
  data: {
    // API配置
    API_KEY: "cd6262e8f806b3f73d44d67031d96709", // 高德天气API密钥（需要申请）
    WEATHER_API_URL: "https://restapi.amap.com/v3/weather/weatherInfo",
    // 心知天气生活指数API配置
    SENIVERSE_API_KEY: "SvR5l2gdLKh8X8AmN", // 心知天气API密钥
    SENIVERSE_LIFE_API_URL: "https://api.seniverse.com/v3/life/suggestion.json",
    // 高德天气API支持实时天气和预报，通过extensions参数区分
    // extensions=base: 实时天气
    // extensions=all: 天气预报（3天）

    // 搜索相关
    searchCity: "",
    errorMessage: "",

    // 天气数据
    currentWeather: null,
    currentLocation: "",
    forecastData: [],
    updateTime: "--",

    // 生活指数数据
    lifeSuggestions: [],

    // 图表数据
    chartData: {
      labels: [],
      temps: [],
    },

    // 图表实例
    tempChart: null,
  },
  computed: {
    /**
     * 计算天气图标URL
     */
    weatherIconUrl() {
      if (!this.currentWeather) return ""
      return `https://a.hecdn.net/img/common/icon/202106d/${this.currentWeather.icon}.png`
    },

    /**
     * 天气详情数据
     */
    weatherDetails() {
      if (!this.currentWeather) return []

      return [
        {
          icon: "fa-wind",
          value: this.currentWeather.windSpeed,
          label: "风力",
          suffix: "",
        },
        {
          icon: "fa-tint",
          value: this.currentWeather.humidity,
          label: "湿度",
          suffix: "%",
        },
        {
          icon: "fa-compass",
          value: this.currentWeather.windDirection,
          label: "风向",
          suffix: "",
        },
        {
          icon: "fa-thermometer-half",
          value: this.currentWeather.feelsLike,
          label: "体感温度",
          suffix: "°C",
        },
        {
          icon: "fa-eye",
          value: this.currentWeather.visibility,
          label: "能见度",
          suffix: "km",
        },
        {
          icon: "fa-clock",
          value: this.currentWeather.reportTime,
          label: "更新时间",
          suffix: "",
        },
      ]
    },
  },
  methods: {
    /**
     * 初始化应用，加载默认城市天气
     */
    init() {
      this.fetchWeatherData("北京")
    },

    /**
     * 搜索天气
     */
    searchWeather() {
      const city = this.searchCity.trim()
      if (city) {
        this.fetchWeatherData(city)
      }
    },

    /**
     * 获取位置天气
     */
    getLocationWeather() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            this.fetchWeatherByCoords(latitude, longitude)
          },
          (error) => {
            this.showError("无法获取您的位置信息")
          }
        )
      } else {
        this.showError("您的浏览器不支持地理位置服务")
      }
    },

    /**
     * 通过坐标获取天气（高德API）
     */
    async fetchWeatherByCoords(lat, lon) {
      try {
        // 高德天气API支持通过坐标查询天气
        // 使用逆地理编码获取城市名称，然后查询天气
        const geoResponse = await fetch(`https://restapi.amap.com/v3/geocode/regeo?key=${this.API_KEY}&location=${lon},${lat}&radius=1000&extensions=base`)
        const geoData = await geoResponse.json()

        if (geoData.status === "1" && geoData.regeocode) {
          const city = geoData.regeocode.addressComponent.city || geoData.regeocode.addressComponent.province
          if (city) {
            await this.fetchWeatherDataByCity(city)
          } else {
            this.showError("无法获取该位置的天气信息")
          }
        } else {
          this.showError("无法获取该位置的天气信息")
        }
      } catch (error) {
        this.handleError("获取天气失败", error)
      }
    },

    /**
     * 通过城市名称获取天气
     */
    async fetchWeatherData(city) {
      try {
        // 高德天气API直接使用城市名称查询
        await this.fetchWeatherDataByCity(city)
      } catch (error) {
        this.handleError("获取天气失败", error)
      }
    },

    /**
     * 通过城市名称获取天气数据（高德API）
     */
    async fetchWeatherDataByCity(cityName) {
      try {
        // 获取实时天气
        const currentResponse = await fetch(`${this.WEATHER_API_URL}?key=${this.API_KEY}&city=${cityName}&extensions=base`)
        const currentData = await currentResponse.json()

        if (currentData.status === "1" && currentData.lives.length > 0) {
          this.displayCurrentWeather(currentData, cityName)
          // 获取天气预报
          await this.fetchWeatherForecast(cityName)
          // 获取生活指数
          await this.fetchLifeSuggestion(cityName)
        } else {
          this.showError("城市名称无效或未找到")
        }
      } catch (error) {
        this.handleError("获取天气失败", error)
      }
    },

    /**
     * 获取天气预报（高德API）
     */
    async fetchWeatherForecast(cityName) {
      try {
        const response = await fetch(`${this.WEATHER_API_URL}?key=${this.API_KEY}&city=${cityName}&extensions=all`)
        const data = await response.json()

        if (data.status === "1" && data.forecasts.length > 0) {
          const forecastData = data.forecasts[0]
          // 直接使用高德API数据格式，减少转换步骤
          this.forecastData = forecastData.casts.slice(0, 4)
          this.prepareChartData(data)
        }
      } catch (error) {
        this.handleError("获取预报失败", error)
      }
    },

    /**
     * 获取生活指数（心知天气API）
     */
    async fetchLifeSuggestion(cityName) {
      try {
        // 使用您提供的完整URL，包含正确的API密钥
        const apiUrl = `https://api.seniverse.com/v3/life/suggestion.json?key=SvR5l2gdLKh8X8AmN&location=${encodeURIComponent(cityName)}&language=zh-Hans&days=5`

        const response = await fetch(apiUrl)

        if (!response.ok) {
          throw new Error(`API请求失败: ${response.status}`)
        }

        const data = await response.json()

        if (data.results && data.results.length > 0) {
          const result = data.results[0]
          if (result.suggestion) {
            // 提取关键的生活指数信息
            this.lifeSuggestions = this.processLifeSuggestions(result.suggestion)
            // 强制Vue重新渲染
            this.$forceUpdate()
          } else {
            this.lifeSuggestions = this.getMockLifeSuggestions()
          }
        } else {
          this.lifeSuggestions = this.getMockLifeSuggestions()
        }
      } catch (error) {
        this.lifeSuggestions = this.getMockLifeSuggestions()
        this.$forceUpdate()
      }
    },

    /**
     * 处理生活指数数据
     */
    processLifeSuggestions(suggestions) {
      // 检查数据结构：可能是对象而不是数组
      if (!suggestions) {
        return this.getMockLifeSuggestions()
      }

      // 首先尝试直接处理对象结构
      let result = []

      // 如果suggestions是对象，尝试提取其中的生活指数
      if (typeof suggestions === "object" && !Array.isArray(suggestions)) {
        // 定义需要显示的生活指数类型
        const importantTypes = ["dressing", "car_washing", "flu", "sport", "uv", "comfort"]

        // 映射生活指数类型到显示信息
        const typeMap = {
          dressing: { label: "穿衣指数", icon: "fa-tshirt" },
          car_washing: { label: "洗车指数", icon: "fa-car" },
          flu: { label: "感冒指数", icon: "fa-head-side-cough" },
          sport: { label: "运动指数", icon: "fa-running" },
          uv: { label: "紫外线指数", icon: "fa-sun" },
          comfort: { label: "舒适度指数", icon: "fa-smile" },
        }

        // 遍历对象的所有属性，查找生活指数数据
        for (const [key, value] of Object.entries(suggestions)) {
          // 如果属性名是生活指数类型
          if (importantTypes.includes(key)) {
            result.push({
              label: typeMap[key]?.label || key,
              icon: typeMap[key]?.icon || "fa-info-circle",
              brief: value?.brief || value?.desc || value?.category || "暂无数据",
              details: value?.details || value?.info || value?.text || "数据加载中...",
            })
          }
          // 如果属性值是对象且包含生活指数数据
          else if (value && typeof value === "object" && value.name && importantTypes.includes(value.name)) {
            result.push({
              label: typeMap[value.name]?.label || value.name,
              icon: typeMap[value.name]?.icon || "fa-info-circle",
              brief: value.brief || value.desc || value.category || "暂无数据",
              details: value.details || value.info || value.text || "数据加载中...",
            })
          }
        }
      }
      // 如果是数组结构，按原逻辑处理
      else if (Array.isArray(suggestions)) {
        // 定义需要显示的生活指数类型
        const importantTypes = ["dressing", "car_washing", "flu", "sport", "uv", "comfort"]

        // 映射生活指数类型到显示信息
        const typeMap = {
          dressing: { label: "穿衣指数", icon: "fa-tshirt" },
          car_washing: { label: "洗车指数", icon: "fa-car" },
          flu: { label: "感冒指数", icon: "fa-head-side-cough" },
          sport: { label: "运动指数", icon: "fa-running" },
          uv: { label: "紫外线指数", icon: "fa-sun" },
          comfort: { label: "舒适度指数", icon: "fa-smile" },
        }

        // 过滤出需要显示的生活指数
        result = suggestions
          .filter((suggestion) => suggestion && suggestion.name && importantTypes.includes(suggestion.name))
          .map((suggestion) => ({
            label: typeMap[suggestion.name]?.label || suggestion.name,
            icon: typeMap[suggestion.name]?.icon || "fa-info-circle",
            brief: suggestion.brief || suggestion.desc || suggestion.category || "暂无数据",
            details: suggestion.details || suggestion.info || suggestion.text || "数据加载中...",
          }))
      }

      // 如果API返回的数据为空，使用模拟数据
      if (result.length === 0) {
        return this.getMockLifeSuggestions()
      }

      return result
    },

    /**
     * 获取模拟生活指数数据
     */
    getMockLifeSuggestions(cityName) {
      return [
        {
          label: "穿衣指数",
          icon: "fa-tshirt",
          brief: "建议穿着轻薄衣物",
          details: "天气温暖，适合穿着短袖、薄外套等轻薄衣物",
        },
        {
          label: "洗车指数",
          icon: "fa-car",
          brief: "适宜洗车",
          details: "未来24小时无雨，适宜洗车",
        },
        {
          label: "感冒指数",
          icon: "fa-head-side-cough",
          brief: "少发感冒",
          details: "天气条件不易引发感冒，但请注意适当增减衣物",
        },
        {
          label: "运动指数",
          icon: "fa-running",
          brief: "适宜运动",
          details: "天气条件适宜户外运动",
        },
        {
          label: "紫外线指数",
          icon: "fa-sun",
          brief: "中等强度",
          details: "紫外线强度中等，外出时建议涂抹防晒霜",
        },
        {
          label: "舒适度指数",
          icon: "fa-smile",
          brief: "舒适",
          details: "天气条件舒适，适宜外出活动",
        },
      ]
    },

    /**
     * 显示当前天气（高德API）
     */
    displayCurrentWeather(data, cityName) {
      // 高德API实时天气数据在lives数组中
      if (data.lives && data.lives.length > 0) {
        const liveData = data.lives[0]
        this.currentWeather = {
          temp: liveData.temperature, // 温度
          text: liveData.weather, // 天气状况
          icon: this.getWeatherIconCode(liveData.weather), // 天气图标代码
          windSpeed: liveData.windpower, // 风力
          windDirection: liveData.winddirection || "--", // 风向
          humidity: liveData.humidity, // 湿度
          reportTime: this.formatReportTime(liveData.reporttime), // 报告时间
          feelsLike: this.calculateFeelsLike(liveData.temperature, liveData.humidity), // 体感温度
          visibility: liveData.visibility || "--", // 能见度
        }
        this.currentLocation = cityName
        this.updateTime = new Date().toLocaleString("zh-CN")
        this.errorMessage = ""

        // 更新背景样式
        this.updateBackground()
      }
    },

    /**
     * 根据天气状况获取图标代码（高德API适配）
     */
    getWeatherIconCode(weatherText) {
      // 简化处理：根据天气文本映射到和风天气图标代码
      const weather = weatherText.toLowerCase()
      if (weather.includes("晴")) return "100"
      if (weather.includes("云") || weather.includes("阴")) return "101"
      if (weather.includes("雨")) return "305"
      if (weather.includes("雪")) return "399"
      if (weather.includes("雾")) return "501"
      return "999" // 默认
    },

    /**
     * 格式化报告时间
     */
    formatReportTime(reportTime) {
      if (!reportTime) return "--"
      try {
        const date = new Date(reportTime)
        return date.toLocaleString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      } catch {
        return reportTime
      }
    },

    /**
     * 计算体感温度（简化算法）
     */
    calculateFeelsLike(temp, humidity) {
      if (!temp || !humidity) return "--"
      const temperature = parseInt(temp)
      const hum = parseInt(humidity)

      // 简化的体感温度计算
      if (temperature >= 27) {
        // 高温高湿时体感温度更高
        return Math.round(temperature + (hum / 100) * 2)
      } else if (temperature <= 10) {
        // 低温高湿时体感温度更低
        return Math.round(temperature - (hum / 100) * 1)
      }
      return temperature
    },

    /**
     * 准备图表数据（高德API适配）
     */
    prepareChartData(data) {
      // 简化图表数据准备，只保留温度图表
      if (data.forecasts && data.forecasts.length > 0) {
        const forecastData = data.forecasts[0]
        this.chartData = {
          labels: forecastData.casts.slice(0, 4).map((cast) => new Date(cast.date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })),
          temps: forecastData.casts.slice(0, 4).map((cast) => Math.round((parseInt(cast.daytemp) + parseInt(cast.nighttemp)) / 2)),
        }
        this.createCharts()
      }
    },

    /**
     * 创建图表
     */
    createCharts() {
      // 延迟创建图表，确保DOM已渲染
      this.$nextTick(() => {
        // 温度图表
        if (this.tempChart) {
          this.tempChart.destroy()
        }

        const tempCtx = document.getElementById("tempChart")
        if (tempCtx) {
          this.tempChart = new Chart(tempCtx.getContext("2d"), {
            type: "line",
            data: {
              labels: this.chartData.labels,
              datasets: [
                {
                  label: "温度 (°C)",
                  data: this.chartData.temps,
                  borderColor: "#FF9A8B",
                  backgroundColor: "rgba(255, 154, 139, 0.1)",
                  borderWidth: 3,
                  pointBackgroundColor: "#FF6B6B",
                  pointRadius: 5,
                  fill: true,
                  tension: 0.3,
                },
              ],
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  labels: { color: "rgba(255, 255, 255, 0.8)" },
                },
              },
              scales: {
                y: {
                  grid: { color: "rgba(255, 255, 255, 0.1)" },
                  ticks: { color: "rgba(255, 255, 255, 0.7)" },
                },
                x: {
                  grid: { color: "rgba(255, 255, 255, 0.1)" },
                  ticks: { color: "rgba(255, 255, 255, 0.7)" },
                },
              },
            },
          })
        }
      })
    },

    /**
     * 更新背景
     */
    updateBackground() {
      if (!this.currentWeather) return

      // 移除所有天气类
      document.body.classList.remove("sunny", "cloudy", "rainy", "night")

      // 简化处理：根据天气文本设置背景
      const weather = this.currentWeather.text.toLowerCase()

      if (weather.includes("晴")) {
        document.body.classList.add("sunny")
      } else if (weather.includes("云") || weather.includes("阴") || weather.includes("雾")) {
        document.body.classList.add("cloudy")
      } else if (weather.includes("雨") || weather.includes("雪")) {
        document.body.classList.add("rainy")
      } else {
        // 默认使用基础背景
        document.body.classList.add("night")
      }
    },

    /**
     * 格式化日期
     */
    formatDate(dateString) {
      const date = new Date(dateString)
      return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
    },

    /**
     * 统一错误处理方法
     */
    handleError(context, error) {
      this.showError("获取天气数据失败")
    },

    /**
     * 显示错误消息
     */
    showError(message) {
      this.errorMessage = message
    },
  },

  /**
   * 生命周期钩子
   */
  mounted() {
    this.init()
  },

  /**
   * 组件销毁前清理图表
   */
  beforeDestroy() {
    if (this.tempChart) {
      this.tempChart.destroy()
    }
    if (this.precipChart) {
      this.precipChart.destroy()
    }
  },
})
